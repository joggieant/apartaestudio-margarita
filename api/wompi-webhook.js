// api/wompi-webhook.js
//
// Wompi llama a esta URL automáticamente cada vez que una transacción
// cambia de estado. Cuando el pago queda APROBADO:
//   1) Verifica que el evento realmente venga de Wompi (checksum).
//   2) Crea un evento en el Google Calendar de disponibilidad.
//   3) Registra la reserva en Supabase, con un código corto (MAR-0001...).
//   4) Envía correos: notificación al anfitrión y al co-anfitrión (en
//      español), y confirmación al huésped en el idioma que seleccionó
//      en la página al reservar.
//
// Variables de entorno necesarias (además de las ya configuradas para
// _googleAuth.js y _mailer.js):
//   WOMPI_EVENTS_SECRET, NOTIFY_HOST_EMAIL, NOTIFY_COHOST_EMAIL,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL

const crypto = require("crypto");
const { createCalendarEvent } = require("../lib/_calendar");
const { sendEmail } = require("../lib/_mailer");
const { supabaseRequest } = require("../lib/_supabase");
const { confirmationEmail, guideFooter } = require("../lib/_emailTemplates");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const event = req.body || {};
    const isValid = verifyChecksum(event, process.env.WOMPI_EVENTS_SECRET);

    if (!isValid) {
      console.warn("Webhook de Wompi con checksum inválido — ignorado");
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const tx = event?.data?.transaction;
    if (!tx || tx.status !== "APPROVED") {
      res.status(200).json({ received: true, skipped: tx?.status || "no-transaction" });
      return;
    }

    const { checkin, checkout, guests, lang } = parseReference(tx.reference);
    const guestName = tx.customer_data?.full_name || "Huésped";
    const guestEmail = tx.customer_email || tx.customer_data?.email || "";
    const guestPhone = tx.customer_data?.phone_number || "";
    const amountCOP = Math.round(tx.amount_in_cents / 100);

    let calendarEventId = null;
    let nights = null;
    if (checkin && checkout) {
      calendarEventId = await createCalendarEvent({ checkin, checkout, guestName, reference: tx.reference });
      nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    }

    const bookingCode = await registerBooking({
      guestName, guestEmail, guestPhone, checkin, checkout, nights, guests, lang,
      amountCOP, wompiReference: tx.reference, calendarEventId,
    });

    await sendNotificationEmails({
      guestName, guestEmail, guestPhone, checkin, checkout, guests, lang,
      amountCOP, reference: tx.reference, bookingCode,
    });

    res.status(200).json({ received: true, processed: true, bookingCode });
  } catch (err) {
    console.error("Error procesando webhook de Wompi:", err);
    res.status(200).json({ received: true, error: String(err) });
  }
};

function verifyChecksum(event, secret) {
  if (!secret || !event?.signature?.properties || !event?.signature?.checksum) return false;
  const values = event.signature.properties.map(path => getByPath(event.data, path));
  const chain = values.join("") + String(event.timestamp) + secret;
  const computed = crypto.createHash("sha256").update(chain).digest("hex");
  return computed.toUpperCase() === String(event.signature.checksum).toUpperCase();
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function parseReference(reference) {
  // Formato: RES-YYYYMMDD-YYYYMMDD-G{n}-{lang}-{timestamp}-{random}
  const m = /^RES-(\d{8})-(\d{8})-G(\d)-([a-z]{2})-/.exec(reference || "");
  if (!m) return { checkin: null, checkout: null, guests: null, lang: "es" };
  const toIso = s => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return { checkin: toIso(m[1]), checkout: toIso(m[2]), guests: Number(m[3]), lang: m[4] };
}

async function registerBooking({ guestName, guestEmail, guestPhone, checkin, checkout, nights, guests, lang, amountCOP, wompiReference, calendarEventId }) {
  try {
    const inserted = await supabaseRequest("bookings", {
      method: "POST",
      body: JSON.stringify([{
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        checkin, checkout, nights, guests, lang,
        amount_cop_charged: amountCOP,
        wompi_reference: wompiReference,
        calendar_event_id: calendarEventId,
        status: "confirmed",
      }]),
    });
    const newId = inserted?.[0]?.id;
    if (!newId) return null;
    const bookingCode = "MAR-" + String(newId).padStart(4, "0");
    await supabaseRequest(`bookings?id=eq.${newId}`, {
      method: "PATCH",
      body: JSON.stringify({ booking_code: bookingCode }),
    });
    return bookingCode;
  } catch (err) {
    console.error("No se pudo registrar la reserva en Supabase:", err);
    return null;
  }
}

async function sendNotificationEmails({ guestName, guestEmail, guestPhone, checkin, checkout, guests, lang, amountCOP, reference, bookingCode }) {
  const hostEmail = process.env.NOTIFY_HOST_EMAIL;
  const cohostEmail = process.env.NOTIFY_COHOST_EMAIL;
  const dates = checkin && checkout ? `${checkin} → ${checkout}` : "(no se pudieron leer las fechas de la referencia)";
  const codeLine = bookingCode ? `<p><strong>Código de reserva:</strong> ${bookingCode}</p>` : "";

  const internalHtml = `
    <h2>Nueva reserva confirmada ✅</h2>
    ${codeLine}
    <p><strong>Huésped:</strong> ${guestName}</p>
    <p><strong>Correo:</strong> ${guestEmail}</p>
    <p><strong>Teléfono:</strong> ${guestPhone || "(no proporcionado)"}</p>
    <p><strong>Fechas:</strong> ${dates}</p>
    <p><strong>Huéspedes:</strong> ${guests || "(no especificado)"}</p>
    <p><strong>Monto pagado:</strong> $${amountCOP.toLocaleString("es-CO")} COP</p>
    <p><strong>Referencia Wompi:</strong> ${reference}</p>
    <p>Ya quedó bloqueado automáticamente en el calendario de disponibilidad.</p>
    ${guideFooter("es")}
  `;

  const guest = confirmationEmail({ lang, guestName, dates, guests, bookingCode });

  const tasks = [];
  if (hostEmail) tasks.push(sendEmail({ to: hostEmail, subject: `Nueva reserva — ${guestName} (${bookingCode || "s/código"})`, html: internalHtml }));
  if (cohostEmail) tasks.push(sendEmail({ to: cohostEmail, subject: `Nueva reserva — ${guestName} (${bookingCode || "s/código"})`, html: internalHtml }));
  if (guestEmail) tasks.push(sendEmail({ to: guestEmail, subject: guest.subject, html: guest.html }));

  await Promise.all(tasks);
}

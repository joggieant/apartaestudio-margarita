// api/wompi-webhook.js
//
// Wompi llama a esta URL automáticamente cada vez que una transacción
// cambia de estado. Cuando el pago queda APROBADO:
//   1) Verifica que el evento realmente venga de Wompi (checksum).
//   2) Crea un evento en el Google Calendar de disponibilidad, para
//      bloquear esas fechas automáticamente.
//   3) Envía un correo de notificación al anfitrión, al co-anfitrión
//      y una confirmación al huésped — usando tu propia cuenta de Gmail.
//
// Variables de entorno necesarias (Vercel → Settings → Environment Variables):
//   WOMPI_EVENTS_SECRET            -> Dashboard Wompi → Desarrolladores → Secretos
//                                      (el de EVENTOS, distinto al de integridad)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL   -> ya configurado para check-availability
//   GOOGLE_PRIVATE_KEY             -> ya configurado para check-availability
//   GMAIL_USER                     -> tu dirección de Gmail (ej. tucorreo@gmail.com)
//   GMAIL_APP_PASSWORD             -> "Contraseña de aplicación" de Gmail (16 caracteres)
//   NOTIFY_HOST_EMAIL              -> correo del anfitrión (Jose Guillermo)
//   NOTIFY_COHOST_EMAIL            -> correo del co-anfitrión (Juan)

const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { getGoogleAccessToken } = require("./_googleAuth");

const CALENDAR_ID = "b571eda0864910f3c16461db023732eefdb6e342b695f2f72204e687f16442c6@group.calendar.google.com";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const event = req.body || {};
    const isValid = verifyChecksum(event, process.env.WOMPI_EVENTS_SECRET);

    if (!isValid) {
      // Respondemos 200 igual (para que Wompi no reintente indefinidamente),
      // pero ignoramos el evento por completo.
      console.warn("Webhook de Wompi con checksum inválido — ignorado");
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const tx = event?.data?.transaction;
    if (!tx || tx.status !== "APPROVED") {
      // Solo actuamos cuando el pago quedó efectivamente aprobado.
      res.status(200).json({ received: true, skipped: tx?.status || "no-transaction" });
      return;
    }

    const { checkin, checkout } = parseDatesFromReference(tx.reference);
    const guestName = tx.customer_data?.full_name || "Huésped";
    const guestEmail = tx.customer_email || tx.customer_data?.email || "";
    const guestPhone = tx.customer_data?.phone_number || "";
    const amount = (tx.amount_in_cents / 100).toLocaleString("es-CO");

    if (checkin && checkout) {
      await createCalendarEvent({ checkin, checkout, guestName, reference: tx.reference });
    }

    await sendNotificationEmails({ guestName, guestEmail, guestPhone, checkin, checkout, amount, reference: tx.reference });

    res.status(200).json({ received: true, processed: true });
  } catch (err) {
    console.error("Error procesando webhook de Wompi:", err);
    // Igual respondemos 200: ya registramos el error en los logs de Vercel,
    // y no queremos que Wompi reintente un evento que probablemente fallará igual.
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

function parseDatesFromReference(reference) {
  // Formato: RES-YYYYMMDD-YYYYMMDD-timestamp-random
  const m = /^RES-(\d{8})-(\d{8})-/.exec(reference || "");
  if (!m) return { checkin: null, checkout: null };
  const toIso = s => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return { checkin: toIso(m[1]), checkout: toIso(m[2]) };
}

async function createCalendarEvent({ checkin, checkout, guestName, reference }) {
  const accessToken = await getGoogleAccessToken();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

  const body = {
    summary: `Reservado — ${guestName}`,
    description: `Reserva confirmada vía sitio web. Referencia: ${reference}`,
    start: { date: checkin },
    end: { date: checkout },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    console.error("No se pudo crear el evento en el calendario:", await r.text());
  }
}

let cachedTransporter = null;
function getGmailTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Faltan GMAIL_USER o GMAIL_APP_PASSWORD");
  }
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

async function sendEmail({ to, subject, html }) {
  try {
    const transporter = getGmailTransporter();
    await transporter.sendMail({
      from: `"Apartaestudio Los Robles" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`No se pudo enviar el correo a ${to}:`, err);
  }
}

async function sendNotificationEmails({ guestName, guestEmail, guestPhone, checkin, checkout, amount, reference }) {
  const hostEmail = process.env.NOTIFY_HOST_EMAIL;
  const cohostEmail = process.env.NOTIFY_COHOST_EMAIL;
  const dates = checkin && checkout ? `${checkin} → ${checkout}` : "(no se pudieron leer las fechas de la referencia)";

  const internalHtml = `
    <h2>Nueva reserva confirmada ✅</h2>
    <p><strong>Huésped:</strong> ${guestName}</p>
    <p><strong>Correo:</strong> ${guestEmail}</p>
    <p><strong>Teléfono:</strong> ${guestPhone || "(no proporcionado)"}</p>
    <p><strong>Fechas:</strong> ${dates}</p>
    <p><strong>Monto pagado:</strong> $${amount} COP</p>
    <p><strong>Referencia Wompi:</strong> ${reference}</p>
    <p>Ya quedó bloqueado automáticamente en el calendario de disponibilidad.</p>
  `;

  const guestHtml = `
    <h2>¡Tu reserva está confirmada!</h2>
    <p>Hola ${guestName}, gracias por tu pago. Tu estadía en el apartaestudio (Los Robles, Maneiro) quedó confirmada para:</p>
    <p><strong>${dates}</strong></p>
    <p>Pronto Juan (nuestro co-anfitrión en la isla) se pondrá en contacto contigo para coordinar los detalles de tu llegada.</p>
    <p>Referencia de tu pago: ${reference}</p>
    <p>¡Nos vemos pronto en Margarita!</p>
  `;

  const tasks = [];
  if (hostEmail) tasks.push(sendEmail({ to: hostEmail, subject: `Nueva reserva — ${guestName}`, html: internalHtml }));
  if (cohostEmail) tasks.push(sendEmail({ to: cohostEmail, subject: `Nueva reserva — ${guestName}`, html: internalHtml }));
  if (guestEmail) tasks.push(sendEmail({ to: guestEmail, subject: "Tu reserva está confirmada", html: guestHtml }));

  await Promise.all(tasks);
}

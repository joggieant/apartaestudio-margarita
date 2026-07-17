// api/admin.js
//
// Endpoint único para TODA la funcionalidad del panel de administración.
// Se consolidó en un solo archivo porque el plan gratuito (Hobby) de
// Vercel permite un máximo de 12 Serverless Functions por proyecto, y
// tener un archivo por acción se pasaba de ese límite.
//
// El panel (admin.html) le manda un campo "action" en el body para decirle
// qué operación quiere hacer: login, search, list, cancel, update, reset.

const { verifyAdminToken, getTokenFromRequest, createAdminToken } = require("../lib/_adminAuth");
const { supabaseRequest } = require("../lib/_supabase");
const { deleteCalendarEvent, createCalendarEvent, isRangeAvailable } = require("../lib/_calendar");
const { sendEmail } = require("../lib/_mailer");
const { calculateRefundPercent } = require("../lib/_refundPolicy");
const { fetchTRM } = require("../lib/_trm");
const { cancellationEmail, dateChangeEmail, guideFooter } = require("../lib/_emailTemplates");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { action } = req.body || {};

  if (action === "login") {
    return handleLogin(req, res);
  }

  // Todo lo demás requiere una sesión de administrador válida
  if (!verifyAdminToken(getTokenFromRequest(req))) {
    res.status(401).json({ error: "Sesión inválida o expirada, vuelve a iniciar sesión" });
    return;
  }

  try {
    switch (action) {
      case "search": return await handleSearch(req, res);
      case "list": return await handleList(req, res);
      case "cancel": return await handleCancel(req, res);
      case "update": return await handleUpdate(req, res);
      case "reset": return await handleReset(req, res);
      default:
        res.status(400).json({ error: "Acción desconocida" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

/* ============================================================
   LOGIN
   ============================================================ */
async function handleLogin(req, res) {
  const { password } = req.body || {};
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Contraseña incorrecta" });
    return;
  }
  const token = createAdminToken();
  res.status(200).json({ token });
}

/* ============================================================
   BUSCAR UNA RESERVA
   ============================================================ */
async function handleSearch(req, res) {
  const { bookingCode } = req.body || {};
  if (!bookingCode) {
    res.status(400).json({ error: "Falta el código de reserva" });
    return;
  }
  const rows = await supabaseRequest(
    `bookings?booking_code=eq.${encodeURIComponent(bookingCode.trim().toUpperCase())}`
  );
  if (!rows || rows.length === 0) {
    res.status(404).json({ error: "No se encontró ninguna reserva con ese código" });
    return;
  }
  const booking = rows[0];
  const estimatedRefundPercent = booking.status === "confirmed"
    ? calculateRefundPercent(booking.checkin)
    : booking.refund_percent;
  res.status(200).json({ booking, estimatedRefundPercent });
}

/* ============================================================
   LISTAR TODAS LAS RESERVAS
   ============================================================ */
async function handleList(req, res) {
  const { status } = req.body || {};
  let path = "bookings?order=checkin.desc&limit=300";
  if (status === "confirmed" || status === "cancelled") {
    path += `&status=eq.${status}`;
  }
  const rows = await supabaseRequest(path);
  res.status(200).json({ bookings: rows || [] });
}

/* ============================================================
   CANCELAR UNA RESERVA
   ============================================================ */
async function handleCancel(req, res) {
  const { bookingCode, reason } = req.body || {};
  if (!bookingCode) {
    res.status(400).json({ error: "Falta el código de reserva" });
    return;
  }

  const rows = await supabaseRequest(
    `bookings?booking_code=eq.${encodeURIComponent(bookingCode.trim().toUpperCase())}`
  );
  if (!rows || rows.length === 0) {
    res.status(404).json({ error: "No se encontró ninguna reserva con ese código" });
    return;
  }

  const booking = rows[0];
  if (booking.status === "cancelled") {
    res.status(400).json({ error: "Esa reserva ya estaba cancelada" });
    return;
  }

  const refundPercent = calculateRefundPercent(booking.checkin);
  const refundAmountCOP = Math.round((booking.amount_cop_charged * refundPercent) / 100);
  const trm = await fetchTRM();
  const refundAmountUSD = Math.round((refundAmountCOP / trm) * 100) / 100;

  await deleteCalendarEvent(booking.calendar_event_id);

  await supabaseRequest(`bookings?booking_code=eq.${booking.booking_code}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "cancelled",
      refund_percent: refundPercent,
      refund_amount_cop: refundAmountCOP,
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    }),
  });

  await sendCancellationEmails({ booking, refundPercent, refundAmountCOP, refundAmountUSD, reason });

  res.status(200).json({ success: true, refundPercent, refundAmountCOP, refundAmountUSD });
}

async function sendCancellationEmails({ booking, refundPercent, refundAmountCOP, refundAmountUSD, reason }) {
  const hostEmail = process.env.NOTIFY_HOST_EMAIL;
  const cohostEmail = process.env.NOTIFY_COHOST_EMAIL;
  const dates = `${booking.checkin} → ${booking.checkout}`;

  const internalHtml = `
    <h2>Reserva cancelada</h2>
    <p><strong>Código:</strong> ${booking.booking_code}</p>
    <p><strong>Huésped:</strong> ${booking.guest_name}</p>
    <p><strong>Fechas liberadas:</strong> ${dates}</p>
    <p><strong>Reembolso correspondiente:</strong> ${refundPercent}% (≈ $${refundAmountUSD} USD / $${refundAmountCOP.toLocaleString("es-CO")} COP)</p>
    ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
    <p>Recuerda ejecutar el reembolso manualmente desde el Dashboard de Wompi si corresponde
       (Transacciones → busca la referencia <strong>${booking.wompi_reference}</strong> → Reembolsar).</p>
    ${guideFooter("es")}
  `;

  const guest = cancellationEmail({
    lang: booking.lang || "es",
    guestName: booking.guest_name,
    bookingCode: booking.booking_code,
    dates,
    refundPercent,
    refundUSD: refundAmountUSD,
  });

  const tasks = [];
  if (hostEmail) tasks.push(sendEmail({ to: hostEmail, subject: `Reserva cancelada — ${booking.booking_code}`, html: internalHtml }));
  if (cohostEmail) tasks.push(sendEmail({ to: cohostEmail, subject: `Reserva cancelada — ${booking.booking_code}`, html: internalHtml }));
  if (booking.guest_email) tasks.push(sendEmail({ to: booking.guest_email, subject: guest.subject, html: guest.html }));
  await Promise.all(tasks);
}

/* ============================================================
   MODIFICAR FECHAS / NOTAS INTERNAS
   ============================================================ */
async function handleUpdate(req, res) {
  const { bookingCode, newCheckin, newCheckout, internalNotes } = req.body || {};
  if (!bookingCode) {
    res.status(400).json({ error: "Falta el código de reserva" });
    return;
  }

  const rows = await supabaseRequest(
    `bookings?booking_code=eq.${encodeURIComponent(bookingCode.trim().toUpperCase())}`
  );
  if (!rows || rows.length === 0) {
    res.status(404).json({ error: "No se encontró ninguna reserva con ese código" });
    return;
  }
  const booking = rows[0];
  const patch = {};

  if (typeof internalNotes === "string") {
    patch.internal_notes = internalNotes;
  }

  let dateChanged = false;
  if (newCheckin && newCheckout) {
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "No se pueden cambiar las fechas de una reserva cancelada" });
      return;
    }
    if (!(newCheckin === booking.checkin && newCheckout === booking.checkout)) {
      const { available } = await isRangeAvailable(newCheckin, newCheckout, booking.calendar_event_id);
      if (!available) {
        res.status(409).json({ error: "Esas fechas no están disponibles (chocan con otra reserva o el día de colchón)" });
        return;
      }
      await deleteCalendarEvent(booking.calendar_event_id);
      const newEventId = await createCalendarEvent({
        checkin: newCheckin, checkout: newCheckout,
        guestName: booking.guest_name, reference: booking.wompi_reference,
      });
      const nights = Math.round((new Date(newCheckout) - new Date(newCheckin)) / (1000 * 60 * 60 * 24));

      patch.checkin = newCheckin;
      patch.checkout = newCheckout;
      patch.nights = nights;
      patch.calendar_event_id = newEventId;
      dateChanged = true;
    }
  }

  if (Object.keys(patch).length > 0) {
    await supabaseRequest(`bookings?booking_code=eq.${booking.booking_code}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  if (dateChanged) {
    await sendDateChangeEmails({ booking, newCheckin, newCheckout });
  }

  res.status(200).json({ success: true, dateChanged });
}

async function sendDateChangeEmails({ booking, newCheckin, newCheckout }) {
  const hostEmail = process.env.NOTIFY_HOST_EMAIL;
  const cohostEmail = process.env.NOTIFY_COHOST_EMAIL;
  const newDates = `${newCheckin} → ${newCheckout}`;

  const internalHtml = `
    <h2>Fechas de reserva modificadas</h2>
    <p><strong>Código:</strong> ${booking.booking_code}</p>
    <p><strong>Huésped:</strong> ${booking.guest_name}</p>
    <p><strong>Antes:</strong> ${booking.checkin} → ${booking.checkout}</p>
    <p><strong>Ahora:</strong> ${newDates}</p>
    ${guideFooter("es")}
  `;

  const guest = dateChangeEmail({
    lang: booking.lang || "es",
    guestName: booking.guest_name,
    bookingCode: booking.booking_code,
    newDates,
  });

  const tasks = [];
  if (hostEmail) tasks.push(sendEmail({ to: hostEmail, subject: `Fechas modificadas — ${booking.booking_code}`, html: internalHtml }));
  if (cohostEmail) tasks.push(sendEmail({ to: cohostEmail, subject: `Fechas modificadas — ${booking.booking_code}`, html: internalHtml }));
  if (booking.guest_email) tasks.push(sendEmail({ to: booking.guest_email, subject: guest.subject, html: guest.html }));
  await Promise.all(tasks);
}

/* ============================================================
   BORRAR TODO EL HISTORIAL (zona de peligro)
   ============================================================ */
async function handleReset(req, res) {
  const { confirmation } = req.body || {};
  if (confirmation !== "BORRAR") {
    res.status(400).json({ error: 'Debes enviar la confirmación exacta "BORRAR"' });
    return;
  }

  const rows = await supabaseRequest("bookings?select=id,calendar_event_id,status");
  const deletions = (rows || [])
    .filter(r => r.status === "confirmed" && r.calendar_event_id)
    .map(r => deleteCalendarEvent(r.calendar_event_id));
  await Promise.all(deletions);

  await supabaseRequest("bookings?id=gt.0", { method: "DELETE", prefer: "return=minimal" });

  res.status(200).json({ success: true, deletedCount: (rows || []).length });
}


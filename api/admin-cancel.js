// api/admin-cancel.js
//
// Cancela una reserva: calcula el reembolso según la política vigente,
// libera la fecha en el calendario, actualiza el estado en Supabase, y
// notifica por correo al huésped, al anfitrión y al co-anfitrión.
//
// IMPORTANTE: esto NO ejecuta el reembolso de dinero en Wompi — solo
// calcula cuánto le corresponde al huésped. El reembolso real se hace
// manualmente desde el Dashboard de Wompi (Transacciones → Reembolsar).

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
const { deleteCalendarEvent } = require("./_calendar");
const { sendEmail } = require("./_mailer");
const { calculateRefundPercent } = require("./_refundPolicy");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!verifyAdminToken(getTokenFromRequest(req))) {
    res.status(401).json({ error: "Sesión inválida o expirada, vuelve a iniciar sesión" });
    return;
  }

  try {
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

    await sendCancellationEmails({ booking, refundPercent, refundAmountCOP, reason });

    res.status(200).json({ success: true, refundPercent, refundAmountCOP });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

async function sendCancellationEmails({ booking, refundPercent, refundAmountCOP, reason }) {
  const hostEmail = process.env.NOTIFY_HOST_EMAIL;
  const cohostEmail = process.env.NOTIFY_COHOST_EMAIL;
  const dates = `${booking.checkin} → ${booking.checkout}`;

  const internalHtml = `
    <h2>Reserva cancelada</h2>
    <p><strong>Código:</strong> ${booking.booking_code}</p>
    <p><strong>Huésped:</strong> ${booking.guest_name}</p>
    <p><strong>Fechas liberadas:</strong> ${dates}</p>
    <p><strong>Reembolso correspondiente:</strong> ${refundPercent}% ($${refundAmountCOP.toLocaleString("es-CO")} COP)</p>
    ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
    <p>Recuerda ejecutar el reembolso manualmente desde el Dashboard de Wompi si corresponde
       (Transacciones → busca la referencia <strong>${booking.wompi_reference}</strong> → Reembolsar).</p>
  `;

  const guestHtml = `
    <h2>Tu reserva fue cancelada</h2>
    <p>Hola ${booking.guest_name}, te confirmamos que tu reserva <strong>${booking.booking_code}</strong>
       para las fechas ${dates} ha sido cancelada.</p>
    <p>Según nuestra política de cancelación, te corresponde un reembolso del <strong>${refundPercent}%</strong>
       del monto pagado (aproximadamente $${refundAmountCOP.toLocaleString("es-CO")} COP), que procesaremos
       a la brevedad.</p>
    <p>Si tienes alguna pregunta, puedes escribirnos por WhatsApp.</p>
  `;

  const tasks = [];
  if (hostEmail) tasks.push(sendEmail({ to: hostEmail, subject: `Reserva cancelada — ${booking.booking_code}`, html: internalHtml }));
  if (cohostEmail) tasks.push(sendEmail({ to: cohostEmail, subject: `Reserva cancelada — ${booking.booking_code}`, html: internalHtml }));
  if (booking.guest_email) tasks.push(sendEmail({ to: booking.guest_email, subject: `Tu reserva ${booking.booking_code} fue cancelada`, html: guestHtml }));

  await Promise.all(tasks);
}

// api/admin-update.js
//
// Actualiza una reserva existente:
//   - Si vienen newCheckin/newCheckout: mueve las fechas (verificando
//     disponibilidad primero, y recreando el evento del calendario).
//   - Si viene internalNotes: guarda una nota interna (visible solo para
//     los administradores, el huésped nunca la ve).
// Ambas cosas pueden enviarse juntas o por separado.

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
const { isRangeAvailable, deleteCalendarEvent, createCalendarEvent } = require("./_calendar");
const { sendEmail } = require("./_mailer");

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

    // --- Notas internas (independiente de las fechas) ---
    if (typeof internalNotes === "string") {
      patch.internal_notes = internalNotes;
    }

    // --- Cambio de fechas ---
    let dateChanged = false;
    if (newCheckin && newCheckout) {
      if (booking.status === "cancelled") {
        res.status(400).json({ error: "No se pueden cambiar las fechas de una reserva cancelada" });
        return;
      }
      if (newCheckin === booking.checkin && newCheckout === booking.checkout) {
        // No hay cambio real, seguimos de largo (por si solo venían notas)
      } else {
        const { available } = await isRangeAvailable(newCheckin, newCheckout, booking.calendar_event_id);
        if (!available) {
          res.status(409).json({ error: "Esas fechas no están disponibles (chocan con otra reserva o el día de colchón)" });
          return;
        }
        // Recrea el evento del calendario con las nuevas fechas
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
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

async function sendDateChangeEmails({ booking, newCheckin, newCheckout }) {
  const hostEmail = process.env.NOTIFY_HOST_EMAIL;
  const cohostEmail = process.env.NOTIFY_COHOST_EMAIL;

  const internalHtml = `
    <h2>Fechas de reserva modificadas</h2>
    <p><strong>Código:</strong> ${booking.booking_code}</p>
    <p><strong>Huésped:</strong> ${booking.guest_name}</p>
    <p><strong>Antes:</strong> ${booking.checkin} → ${booking.checkout}</p>
    <p><strong>Ahora:</strong> ${newCheckin} → ${newCheckout}</p>
  `;

  const guestHtml = `
    <h2>Tu reserva cambió de fechas</h2>
    <p>Hola ${booking.guest_name}, te confirmamos que tu reserva <strong>${booking.booking_code}</strong>
       ahora queda para las siguientes fechas:</p>
    <p><strong>${newCheckin} → ${newCheckout}</strong></p>
    <p>Si esto no era lo que esperabas, por favor contáctanos lo antes posible.</p>
  `;

  const tasks = [];
  if (hostEmail) tasks.push(sendEmail({ to: hostEmail, subject: `Fechas modificadas — ${booking.booking_code}`, html: internalHtml }));
  if (cohostEmail) tasks.push(sendEmail({ to: cohostEmail, subject: `Fechas modificadas — ${booking.booking_code}`, html: internalHtml }));
  if (booking.guest_email) tasks.push(sendEmail({ to: booking.guest_email, subject: `Tu reserva ${booking.booking_code} cambió de fechas`, html: guestHtml }));

  await Promise.all(tasks);
}

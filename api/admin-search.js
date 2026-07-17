// api/admin-search.js
//
// Busca una reserva por su código (ej. "MAR-0007"). Requiere una sesión
// de administrador válida (token obtenido en /api/admin-login).

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
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
    // Si sigue confirmada, mostramos cuánto le tocaría de reembolso HOY si se cancelara.
    const estimatedRefundPercent = booking.status === "confirmed"
      ? calculateRefundPercent(booking.checkin)
      : booking.refund_percent;

    res.status(200).json({ booking, estimatedRefundPercent });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

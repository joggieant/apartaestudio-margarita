// api/check-availability.js
//
// Verifica si un rango de fechas está libre en el Google Calendar de
// disponibilidad (usado por el formulario de reserva del huésped).

const { isRangeAvailable } = require("./_calendar");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { checkin, checkout } = req.body || {};
    if (!checkin || !checkout) {
      res.status(400).json({ error: "Faltan checkin/checkout" });
      return;
    }
    const result = await isRangeAvailable(checkin, checkout);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Error verificando disponibilidad", detail: String(err) });
  }
};

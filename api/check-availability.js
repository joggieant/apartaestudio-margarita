// api/check-availability.js
//
// Verifica si un rango de fechas está libre en el Google Calendar de
// disponibilidad, dejando además el "colchón" de días configurado
// (minGapDays) libre antes y después de cada evento existente.

const { getGoogleAccessToken } = require("./_googleAuth");

const CALENDAR_ID = "b571eda0864910f3c16461db023732eefdb6e342b695f2f72204e687f16442c6@group.calendar.google.com";
const MIN_GAP_DAYS = 1;

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

    const accessToken = await getGoogleAccessToken();

    // Ampliamos la ventana de búsqueda con el colchón de días a cada lado
    const searchStart = addDays(checkin, -MIN_GAP_DAYS);
    const searchEnd = addDays(checkout, MIN_GAP_DAYS);

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?timeMin=${searchStart}T00:00:00Z&timeMax=${searchEnd}T00:00:00Z&singleEvents=true`;

    const calRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!calRes.ok) {
      const text = await calRes.text();
      throw new Error("Error consultando el calendario: " + text);
    }
    const data = await calRes.json();
    const events = data.items || [];

    // Si hay CUALQUIER evento dentro de la ventana ampliada, consideramos
    // el rango solicitado como no disponible (colisiona con una reserva
    // existente o cae dentro del día de colchón de otra reserva).
    const available = events.length === 0;

    res.status(200).json({ available, conflictingEvents: events.length });
  } catch (err) {
    res.status(500).json({ error: "Error verificando disponibilidad", detail: String(err) });
  }
};

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

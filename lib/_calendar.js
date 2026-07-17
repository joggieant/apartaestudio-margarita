// api/_calendar.js
//
// Crea y elimina eventos en el Google Calendar de disponibilidad.
// Reutiliza la cuenta de servicio ya configurada (_googleAuth.js).

const { getGoogleAccessToken } = require("./_googleAuth");

const CALENDAR_ID = "b571eda0864910f3c16461db023732eefdb6e342b695f2f72204e687f16442c6@group.calendar.google.com";

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
    return null;
  }
  const data = await r.json();
  return data.id || null;
}

async function deleteCalendarEvent(eventId) {
  if (!eventId) return;
  try {
    const accessToken = await getGoogleAccessToken();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`;
    const r = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok && r.status !== 410) {
      // 410 = ya estaba borrado, lo ignoramos sin problema
      console.error("No se pudo eliminar el evento del calendario:", await r.text());
    }
  } catch (err) {
    console.error("Error eliminando evento del calendario:", err);
  }
}

const MIN_GAP_DAYS = 1;

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Consulta si un rango de fechas está libre (con el colchón de días),
// opcionalmente ignorando un evento en particular — útil cuando se está
// moviendo la fecha de una reserva existente, para que no choque consigo misma.
async function isRangeAvailable(checkin, checkout, excludeEventId = null) {
  const accessToken = await getGoogleAccessToken();
  const searchStart = addDays(checkin, -MIN_GAP_DAYS);
  const searchEnd = addDays(checkout, MIN_GAP_DAYS);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
    `?timeMin=${searchStart}T00:00:00Z&timeMax=${searchEnd}T00:00:00Z&singleEvents=true`;

  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error("Error consultando el calendario: " + (await r.text()));
  const data = await r.json();
  const events = (data.items || []).filter(ev => ev.id !== excludeEventId);
  return { available: events.length === 0, conflictingEvents: events.length };
}

module.exports = { createCalendarEvent, deleteCalendarEvent, isRangeAvailable, CALENDAR_ID };

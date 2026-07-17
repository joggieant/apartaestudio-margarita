// api/admin-reset.js
//
// Borra TODO el historial de reservas: elimina cada fila de Supabase y,
// de paso, borra también los eventos de calendario asociados a reservas
// que sigan confirmadas (para no dejar bloqueos "fantasma").
//
// Acción destructiva e irreversible — por eso exige que el cliente envíe
// exactamente la palabra de confirmación "BORRAR" en el body, además de
// la sesión de administrador válida.

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
const { deleteCalendarEvent } = require("./_calendar");

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
    const { confirmation } = req.body || {};
    if (confirmation !== "BORRAR") {
      res.status(400).json({ error: 'Debes enviar la confirmación exacta "BORRAR"' });
      return;
    }

    const rows = await supabaseRequest("bookings?select=id,calendar_event_id,status");

    // Libera del calendario cualquier reserva que siguiera confirmada
    const deletions = (rows || [])
      .filter(r => r.status === "confirmed" && r.calendar_event_id)
      .map(r => deleteCalendarEvent(r.calendar_event_id));
    await Promise.all(deletions);

    // Borra todas las filas de la tabla
    await supabaseRequest("bookings?id=gt.0", { method: "DELETE", prefer: "return=minimal" });

    res.status(200).json({ success: true, deletedCount: (rows || []).length });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

// api/admin-list.js
//
// Lista las reservas (más recientes primero), opcionalmente filtradas
// por estado. Requiere sesión de administrador válida.

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");

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
    const { status } = req.body || {}; // 'confirmed' | 'cancelled' | undefined (todas)
    let path = "bookings?order=checkin.desc&limit=300";
    if (status === "confirmed" || status === "cancelled") {
      path += `&status=eq.${status}`;
    }
    const rows = await supabaseRequest(path);
    res.status(200).json({ bookings: rows || [] });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

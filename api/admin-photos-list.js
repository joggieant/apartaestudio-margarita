// api/admin-photos-list.js
//
// Lista las fotos del alojamiento en su orden actual (para el panel de admin).

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
const { publicUrl } = require("./_storage");

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
    const rows = await supabaseRequest("property_photos?order=sort_order.asc");
    const photos = (rows || []).map(r => ({ id: r.id, url: publicUrl(r.storage_path), sortOrder: r.sort_order }));
    res.status(200).json({ photos });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

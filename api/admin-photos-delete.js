// api/admin-photos-delete.js
//
// Elimina una foto del alojamiento (del storage y de la base de datos).

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
const { deletePhoto } = require("./_storage");

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
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ error: "Falta el id de la foto" });
      return;
    }

    const rows = await supabaseRequest(`property_photos?id=eq.${id}`);
    if (!rows || !rows.length) {
      res.status(404).json({ error: "No se encontró esa foto" });
      return;
    }

    await deletePhoto(rows[0].storage_path);
    await supabaseRequest(`property_photos?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

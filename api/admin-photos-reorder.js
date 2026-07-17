// api/admin-photos-reorder.js
//
// Actualiza el orden de las fotos. Recibe un arreglo de ids en el
// nuevo orden deseado (el primero es el que se ve primero en la galería).

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
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) {
      res.status(400).json({ error: "Falta el nuevo orden" });
      return;
    }

    await Promise.all(
      order.map((id, index) =>
        supabaseRequest(`property_photos?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({ sort_order: index }),
        })
      )
    );

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

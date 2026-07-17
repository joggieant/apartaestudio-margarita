// api/admin-photos-upload.js
//
// Sube una foto nueva del alojamiento. Recibe la imagen ya comprimida y
// codificada en base64 desde el navegador (el panel de admin la redimensiona
// antes de enviarla, para no subir archivos pesados).

const { verifyAdminToken, getTokenFromRequest } = require("./_adminAuth");
const { supabaseRequest } = require("./_supabase");
const { uploadPhoto } = require("./_storage");

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
    const { base64 } = req.body || {};
    if (!base64) {
      res.status(400).json({ error: "Falta la imagen" });
      return;
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 4.5 * 1024 * 1024) {
      res.status(400).json({ error: "La foto es demasiado pesada (máximo ~4.5MB)" });
      return;
    }

    const rows = await supabaseRequest("property_photos?select=sort_order&order=sort_order.desc&limit=1");
    const nextOrder = rows && rows.length ? rows[0].sort_order + 1 : 0;

    const path = `photo-${Date.now()}.jpg`;
    await uploadPhoto(path, buffer, "image/jpeg");

    await supabaseRequest("property_photos", {
      method: "POST",
      body: JSON.stringify([{ storage_path: path, sort_order: nextOrder }]),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

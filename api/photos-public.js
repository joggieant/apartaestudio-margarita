// api/photos-public.js
//
// Endpoint PÚBLICO (sin contraseña) que la guía del huésped consulta para
// mostrar la galería del alojamiento. No expone nada sensible — solo las
// fotos que el anfitrión ya subió para que las vean los huéspedes.

const { supabaseRequest } = require("../lib/_supabase");
const { publicUrl } = require("../lib/_storage");

module.exports = async (req, res) => {
  try {
    const rows = await supabaseRequest("property_photos?order=sort_order.asc");
    const photos = (rows || []).map(r => publicUrl(r.storage_path));
    res.status(200).json({ photos });
  } catch (err) {
    // Si algo falla (ej. todavía no configuraste el storage), devolvemos
    // una lista vacía en vez de un error — el sitio usará automáticamente
    // las fotos incrustadas como respaldo.
    res.status(200).json({ photos: [] });
  }
};

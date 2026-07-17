// api/_storage.js
//
// Sube y elimina archivos en Supabase Storage (bucket "property-photos").
// Usa la misma llave de servicio ya configurada para la base de datos.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "property-photos";

async function uploadPhoto(path, buffer, contentType) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": contentType || "image/jpeg",
        "x-upsert": "true",
      },
      body: buffer,
    }
  );
  if (!res.ok) {
    throw new Error("Error subiendo la foto: " + (await res.text()));
  }
  return true;
}

async function deletePhoto(path) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SERVICE_KEY}` },
    }
  );
  if (!res.ok && res.status !== 404) {
    console.error("No se pudo borrar la foto del storage:", await res.text());
  }
}

function publicUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`;
}

module.exports = { uploadPhoto, deletePhoto, publicUrl, BUCKET };

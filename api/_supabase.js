// api/_supabase.js
//
// Helper para hablar con Supabase usando su API REST (PostgREST),
// sin necesidad de instalar el paquete oficial de Supabase.
//
// Variables de entorno necesarias:
//   SUPABASE_URL              -> ej. https://tuproyecto.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY -> la llave "service_role" (NO la "anon"),
//                                 permite escribir sin restricciones desde
//                                 el servidor. Nunca debe usarse en el navegador.

async function supabaseRequest(path, options = {}) {
  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error de Supabase (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

module.exports = { supabaseRequest };

// api/_trm.js
//
// Consulta la TRM (tasa de cambio oficial COP/USD) para poder mostrar
// montos en dólares en los correos. Si falla, usa una tasa de respaldo.

async function fetchTRM(fallback = 4100) {
  try {
    const res = await fetch("https://co.dolarapi.com/v1/trm");
    if (!res.ok) throw new Error("trm-fetch-failed");
    const data = await res.json();
    return data && data.valor ? data.valor : fallback;
  } catch (err) {
    console.warn("No se pudo obtener la TRM en vivo, usando tasa de respaldo:", err);
    return fallback;
  }
}

module.exports = { fetchTRM };

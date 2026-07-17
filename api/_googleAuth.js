// api/_googleAuth.js
//
// Genera un token de acceso de Google usando una cuenta de servicio,
// sin depender de ninguna librería externa (solo el módulo "crypto"
// que ya viene incluido en Node.js).
//
// Variables de entorno necesarias (configúralas en Vercel):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  -> el "client_email" del JSON de la cuenta de servicio
//   GOOGLE_PRIVATE_KEY            -> el "private_key" del JSON (con los \n literales)

const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY");
  }
  // Vercel guarda \n como texto literal en la variable; hay que convertirlo a salto de línea real.
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(privateKey, "base64");
  const jwt = `${signingInput}.${signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("No se pudo obtener el token de Google: " + text);
  }
  const data = await res.json();
  return data.access_token;
}

module.exports = { getGoogleAccessToken };

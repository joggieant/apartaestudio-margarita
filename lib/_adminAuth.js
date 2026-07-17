// api/_adminAuth.js
//
// Autenticación simple del panel de administración: una contraseña
// compartida (ADMIN_PASSWORD) que genera un token firmado con caducidad,
// en vez de manejar cuentas de usuario individuales.
//
// Variables de entorno necesarias:
//   ADMIN_PASSWORD        -> la contraseña que usarán tú y Juan
//   ADMIN_SESSION_SECRET  -> cualquier cadena larga y aleatoria, solo para
//                             firmar las sesiones (invéntala tú, no tiene
//                             que coincidir con nada externo)

const crypto = require("crypto");

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas

function createAdminToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Falta ADMIN_SESSION_SECRET");
  const expiry = Date.now() + SESSION_DURATION_MS;
  const sig = crypto.createHmac("sha256", secret).update(String(expiry)).digest("hex");
  return `${expiry}.${sig}`;
}

function verifyAdminToken(token) {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || !token) return false;
    const [expiryStr, sig] = token.split(".");
    const expiry = Number(expiryStr);
    if (!expiry || Date.now() > expiry) return false;
    const expectedSig = crypto.createHmac("sha256", secret).update(expiryStr).digest("hex");
    return sig === expectedSig;
  } catch {
    return false;
  }
}

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

module.exports = { createAdminToken, verifyAdminToken, getTokenFromRequest };

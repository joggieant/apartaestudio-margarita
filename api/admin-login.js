// api/admin-login.js
//
// Verifica la contraseña compartida del panel de administración y,
// si es correcta, devuelve un token de sesión válido por 8 horas.
//
// Variables de entorno necesarias:
//   ADMIN_PASSWORD
//   ADMIN_SESSION_SECRET

const { createAdminToken } = require("./_adminAuth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { password } = req.body || {};
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ error: "Contraseña incorrecta" });
      return;
    }
    const token = createAdminToken();
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: "Error interno", detail: String(err) });
  }
};

// api/wompi-sign.js
//
// Genera la "firma de integridad" que Wompi exige para cada pago.
// Esto DEBE correr en el servidor: el secreto de integridad nunca
// debe estar en el HTML/JS que ve el navegador del huésped, porque
// cualquiera podría copiarlo y generar pagos falsos con montos menores.
//
// Configuración necesaria en Vercel:
//   Project Settings → Environment Variables → agregar:
//     WOMPI_INTEGRITY_SECRET = tu secreto (Dashboard Wompi → Desarrolladores
//     → Secretos para integración técnica). Empieza con "test_integrity_"
//     (sandbox) o "prod_integrity_" (producción) según el ambiente.

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { reference, amountInCents, currency } = req.body || {};

    if (!reference || !amountInCents || !currency) {
      res.status(400).json({ error: "Faltan parámetros: reference, amountInCents, currency" });
      return;
    }

    const secret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!secret) {
      res.status(500).json({ error: "WOMPI_INTEGRITY_SECRET no está configurado en Vercel" });
      return;
    }

    // El orden importa: referencia + monto + moneda + secreto
    const chain = `${reference}${amountInCents}${currency}${secret}`;
    const signature = crypto.createHash("sha256").update(chain).digest("hex");

    res.status(200).json({ signature });
  } catch (err) {
    res.status(500).json({ error: "Error interno generando la firma" });
  }
};

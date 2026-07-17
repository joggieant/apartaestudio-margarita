// api/_mailer.js
//
// Envía correos usando tu cuenta de Gmail (Nodemailer + contraseña de
// aplicación). Compartido entre el webhook de pagos y el panel de admin.
//
// Variables de entorno necesarias:
//   GMAIL_USER          -> tu dirección de Gmail
//   GMAIL_APP_PASSWORD  -> tu contraseña de aplicación de 16 caracteres

const nodemailer = require("nodemailer");

let cachedTransporter = null;
function getGmailTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Faltan GMAIL_USER o GMAIL_APP_PASSWORD");
  }
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

async function sendEmail({ to, subject, html }) {
  try {
    const transporter = getGmailTransporter();
    await transporter.sendMail({
      from: `"Apartaestudio Los Robles" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`No se pudo enviar el correo a ${to}:`, err);
  }
}

module.exports = { sendEmail };

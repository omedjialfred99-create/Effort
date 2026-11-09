import 'dotenv/config';
import nodemailer from 'nodemailer';

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.EMAIL_FROM) {
    throw new Error('SMTP non configuré : renseignez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et EMAIL_FROM dans .env');
  }

  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT doit être un port valide');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function emailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM
  );
}

export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  });
}

export function invitationEmail({ recipient, doctorName, invitationUrl }) {
  const safeDoctorName = escapeHtml(doctorName);
  const safeInvitationUrl = escapeHtml(invitationUrl);
  return sendEmail({
    to: recipient,
    subject: 'Votre accès à l’espace médecin - Clinique Effort',
    text: `Bonjour ${doctorName}, définissez votre mot de passe et activez votre espace médecin avec ce lien : ${invitationUrl}. Ce lien est valable 72 heures.`,
    html: `
      <h2>Bienvenue à la Clinique Effort</h2>
      <p>Bonjour ${safeDoctorName},</p>
      <p>Votre compte médecin a été créé. Utilisez le lien ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
      <p><a href="${safeInvitationUrl}">Activer mon espace médecin</a></p>
      <p>Ce lien est valable 72 heures.</p>
    `
  });
}

export function appointmentConfirmationEmail({ recipient, patientName, doctorName, date, code }) {
  const safePatientName = escapeHtml(patientName);
  const safeDoctorName = escapeHtml(doctorName);
  const safeDate = escapeHtml(date);
  const safeCode = escapeHtml(code);
  return sendEmail({
    to: recipient,
    subject: 'Confirmation de votre rendez-vous - Clinique Effort',
    text: `Bonjour ${patientName}, votre rendez-vous avec Dr ${doctorName} est enregistré pour le ${date}. Code de suivi : ${code}.`,
    html: `
      <h2>Rendez-vous enregistré</h2>
      <p>Bonjour ${safePatientName},</p>
      <p>Votre rendez-vous avec <strong>Dr ${safeDoctorName}</strong> est enregistré pour le <strong>${safeDate}</strong>.</p>
      <p>Votre code de suivi : <strong>${safeCode}</strong></p>
      <p>Conservez ce code pour consulter ou annuler votre rendez-vous.</p>
    `
  });
}

const { sendMail, isMailerConfigured } = require('./mailer');

function frontendBaseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:5173';
}

function loginUrl() {
  return `${frontendBaseUrl()}/login`;
}

async function sendVerificationApprovedEmail({ email, role, fullName }) {
  if (!isMailerConfigured() || !email) return false;
  const isCoach = role === 'coach';
  const portal = isCoach ? 'Coach' : 'Business';
  const portalPath = isCoach ? '/coach' : '/business';
  const name = fullName || 'there';
  const subject = `Your ${portal} account is verified — Sports Ecosystem`;
  const text = `Hello ${name},\n\nYour ${portal.toLowerCase()} account has been approved by our admin team. You can now log in and start using the platform.\n\nLog in: ${loginUrl()}\n\nPortal: ${frontendBaseUrl()}${portalPath}`;
  const html = `<p>Hello ${name},</p><p>Your <strong>${portal.toLowerCase()}</strong> account has been <strong>approved</strong> by our admin team. You can now log in and proceed with your activity on the platform.</p><p><a href="${loginUrl()}">Log in to your account</a></p><p>Portal: <a href="${frontendBaseUrl()}${portalPath}">${portal} dashboard</a></p>`;
  try {
    await sendMail({ to: email, subject, text, html });
    return true;
  } catch (e) {
    console.warn('[mailer][verification-approved] failed:', e.message);
    return false;
  }
}

module.exports = { sendVerificationApprovedEmail };

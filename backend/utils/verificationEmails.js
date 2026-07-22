const { sendMail, isMailerConfigured } = require('./mailer');
const { getPublicAppUrlForEmailLinks } = require('./publicAppUrl');

function frontendBaseUrl() {
  return getPublicAppUrlForEmailLinks();
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
  const loginLink = loginUrl();
  const dashboardLink = `${frontendBaseUrl()}${portalPath}`;
  const subject = `Your ${portal} account is verified — Sports Ecosystem`;
  const text = `Hello ${name},\n\nYour ${portal.toLowerCase()} account has been approved by our admin team. You can now log in and start using the platform.\n\nLog in: ${loginLink}\n\nPortal: ${dashboardLink}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #0d9488;">Account Approved</h2>
      <p>Hello ${name},</p>
      <p>Your <strong>${portal.toLowerCase()}</strong> account has been <strong>approved</strong> by our admin team. You can now log in and proceed with your activity on the platform.</p>
      <p style="margin: 25px 0;">
        <a href="${loginLink}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log in to your account</a>
      </p>
      <p style="color: #666; font-size: 14px;">Direct dashboard link:</p>
      <p style="word-break: break-all; font-size: 14px;"><a href="${dashboardLink}" style="color: #0d9488;">${dashboardLink}</a></p>
    </div>
  `;
  try {
    await sendMail({ to: email, subject, text, html });
    return true;
  } catch (e) {
    console.warn('[mailer][verification-approved] failed:', e.message);
    return false;
  }
}

module.exports = { sendVerificationApprovedEmail };

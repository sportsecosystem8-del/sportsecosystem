const dns = require('dns');
const net = require('net');
const nodemailer = require('nodemailer');

const dnsPromises = dns.promises;

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20_000);
const GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 12_000);

/**
 * If true (default) and the primary connect uses 587/STARTTLS, a failed connect
 * (e.g. ETIMEDOUT) is retried once on port 465 with implicit SSL — some networks
 * allow one but not the other.
 */
function trySslPortFallback() {
  const v = String(process.env.SMTP_TRY_SSL_PORT_FALLBACK ?? 'true').toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

function preferResolveIpv4() {
  const v = String(process.env.SMTP_PREFER_IPV4 ?? 'true').toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

function getMailerConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
}

function parseEmailAddress(value) {
  if (!value || typeof value !== 'string') return '';
  const match = /<([^>]+)>/.exec(value);
  return match ? match[1].trim() : value.trim();
}

function parseEmailName(value) {
  if (!value || typeof value !== 'string') return 'Sports Ecosystem';
  const match = /^\s*([^<]+?)\s*</.exec(value);
  return match ? match[1].trim() : 'Sports Ecosystem';
}

/**
 * Nodemailer options for a single attempt (no transport reuse across fallback).
 */
async function buildSmtpTransportOptions(cfg, { implicitSsl = false } = {}) {
  const port = implicitSsl ? 465 : cfg.port;
  const secure = implicitSsl ? true : cfg.secure;

  const base = {
    port,
    secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
  };

  const name = String(cfg.host || '').trim();
  if (!name) {
    return { host: name, ...base };
  }
  if (net.isIP(name) > 0) {
    return { host: name, ...base };
  }
  if (preferResolveIpv4()) {
    try {
      const addrs = await dnsPromises.resolve4(name);
      if (addrs && addrs.length > 0) {
        return { host: addrs[0], servername: name, ...base };
      }
    } catch {
      // use hostname
    }
  }
  return { host: name, ...base };
}

function isConnectFailureRetryableWithSslFallback(err) {
  const code = err && (err.code || (err.cause && err.cause.code));
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH'
  );
}

/**
 * @param {object} options - nodemailer transport options
 */
function createTransportForOptions(options) {
  return nodemailer.createTransport(options);
}

async function sendMailViaBrevo({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmailRaw = process.env.BREVO_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@sports-ecosystem.local';
  const fromEmail = parseEmailAddress(fromEmailRaw);
  const fromName = parseEmailName(fromEmailRaw);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo HTTP API error (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function sendMailViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM || process.env.SMTP_FROM || 'Sports Ecosystem <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend HTTP API error (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function sendMail({ to, subject, html, text }) {
  const provider = process.env.BREVO_API_KEY
    ? 'brevo'
    : process.env.RESEND_API_KEY
      ? 'resend'
      : 'smtp';
  console.log(`[mailer] sendMail to=${to} provider=${provider} subject=${subject}`);

  // Prefer HTTP API in cloud production environments like Render to avoid SMTP port 587 timeouts
  if (process.env.BREVO_API_KEY) {
    try {
      return await sendMailViaBrevo({ to, subject, html, text });
    } catch (e) {
      console.warn('[mailer] Brevo HTTP API failed, falling back:', e.message);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      return await sendMailViaResend({ to, subject, html, text });
    } catch (e) {
      console.warn('[mailer] Resend HTTP API failed, falling back:', e.message);
    }
  }



  const cfg = getMailerConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
    throw new Error('SMTP is not fully configured and no HTTP email API keys (BREVO_API_KEY/RESEND_API_KEY) are set.');
  }

  const primary = await buildSmtpTransportOptions(cfg, { implicitSsl: false });
  const transport1 = createTransportForOptions(primary);
  const payload = { from: cfg.from, to, subject, html, text };

  try {
    return await transport1.sendMail(payload);
  } catch (err) {
    console.error('[mailer] SMTP primary send failed', err?.stack || err?.message || err);

    const canFallback =
      trySslPortFallback() &&
      !cfg.secure &&
      Number(cfg.port) === 587 &&
      isConnectFailureRetryableWithSslFallback(err);

    if (!canFallback) {
      throw err;
    }

    const fallback = await buildSmtpTransportOptions(cfg, { implicitSsl: true });
    const transport2 = createTransportForOptions(fallback);
    try {
      console.warn(
        `[mailer] Primary SMTP (port ${cfg.port}/STARTTLS) failed (${err && err.message}); retrying on port 465 (SSL).`
      );
      return await transport2.sendMail(payload);
    } catch (err2) {
      err2.smtpPreviousError = err;
      throw err2;
    }
  }
}

function isMailerConfigured() {
  if (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) return true;
  const cfg = getMailerConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass && cfg.from);
}

module.exports = { sendMail, isMailerConfigured };

const dns = require('dns');
const net = require('net');
const nodemailer = require('nodemailer');

const dnsPromises = dns.promises;

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20_000);
const GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 12_000);

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
    from: process.env.SMTP_FROM,
  };
}

function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.SMTP_FROM);
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.SMTP_FROM);
}

function isSmtpConfigured() {
  const cfg = getMailerConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass && cfg.from);
}

function isMailerConfigured() {
  return isBrevoConfigured() || isResendConfigured() || isSmtpConfigured();
}

/**
 * Send via Brevo HTTP API — works on Render free tier (no SMTP port needed).
 */
async function sendViaBrevo({ to, subject, html, text }) {
  const Brevo = require('@getbrevo/brevo');
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

  const fromRaw = process.env.SMTP_FROM || 'sepoffical2@gmail.com';
  // Parse "Display Name <email@example.com>" or just "email@example.com"
  const match = fromRaw.match(/^(.*?)\s*<([^>]+)>$/);
  const senderEmail = match ? match[2].trim() : fromRaw.trim();
  const senderName = match ? match[1].trim() || 'Sports Ecosystem' : 'Sports Ecosystem';

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html || `<p>${text}</p>`;
  sendSmtpEmail.textContent = text || '';
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [{ email: to }];

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  console.log(`[mailer][brevo] Email sent to ${to}: messageId=${result?.body?.messageId || 'ok'}`);
  return result;
}

/**
 * Send via Resend HTTP API — works on Render free tier (no SMTP port needed).
 */
async function sendViaResend({ to, subject, html, text }) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.SMTP_FROM || 'onboarding@resend.dev';

  const { data, error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
  }
  return data;
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
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
  };

  const name = String(cfg.host || '').trim();
  if (!name) return { host: name, ...base };
  if (net.isIP(name) > 0) return { host: name, ...base };

  if (preferResolveIpv4()) {
    try {
      const addrs = await dnsPromises.resolve4(name);
      if (addrs && addrs.length > 0) {
        return { host: addrs[0], servername: name, ...base };
      }
    } catch { /* use hostname */ }
  }
  return { host: name, ...base };
}

function isConnectFailureRetryableWithSslFallback(err) {
  const code = err && (err.code || (err.cause && err.cause.code));
  return ['ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH'].includes(code);
}

async function sendViaSmtp({ to, subject, html, text }) {
  const cfg = getMailerConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
    throw new Error('SMTP is not fully configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  const primary = await buildSmtpTransportOptions(cfg, { implicitSsl: false });
  const transport1 = nodemailer.createTransport(primary);
  const payload = { from: cfg.from, to, subject, html, text };

  try {
    return await transport1.sendMail(payload);
  } catch (err) {
    const canFallback =
      trySslPortFallback() &&
      !cfg.secure &&
      Number(cfg.port) === 587 &&
      isConnectFailureRetryableWithSslFallback(err);

    if (!canFallback) throw err;

    console.warn(
      `[mailer] Primary SMTP (port ${cfg.port}/STARTTLS) failed (${err && err.message}); retrying on port 465 (SSL).`
    );
    const fallback = await buildSmtpTransportOptions(cfg, { implicitSsl: true });
    const transport2 = nodemailer.createTransport(fallback);
    try {
      return await transport2.sendMail(payload);
    } catch (err2) {
      err2.smtpPreviousError = err;
      throw err2;
    }
  }
}

/**
 * Main sendMail — priority: Brevo → Resend → SMTP (nodemailer).
 */
async function sendMail({ to, subject, html, text }) {
  if (isBrevoConfigured()) {
    return sendViaBrevo({ to, subject, html, text });
  }
  if (isResendConfigured()) {
    return sendViaResend({ to, subject, html, text });
  }
  return sendViaSmtp({ to, subject, html, text });
}

module.exports = { sendMail, isMailerConfigured };

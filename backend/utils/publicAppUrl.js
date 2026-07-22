'use strict';

/** Development-only fallback when APP_BASE_URL is unset (local Vite default). */
const DEV_FALLBACK_BASE_URL = 'http://localhost:5173';

function normalizePublicBaseUrl(url) {
  if (url == null || String(url).trim() === '') return '';
  return String(url).trim().replace(/\/+$/, '');
}

function isProductionNodeEnv() {
  return process.env.NODE_ENV === 'production';
}

/** True when APP_BASE_URL is set to a non-empty value (after trim). */
function isPublicAppUrlSet() {
  return normalizePublicBaseUrl(process.env.APP_BASE_URL) !== '';
}

/**
 * Base URL for links in outgoing email (verify email, password reset).
 * Production requires APP_BASE_URL; non-production falls back to localhost Vite.
 */
function getPublicAppUrlForEmailLinks() {
  const explicit = normalizePublicBaseUrl(process.env.APP_BASE_URL);
  if (explicit) return explicit;
  if (isProductionNodeEnv()) {
    throw new Error(
      'APP_BASE_URL must be set to your public frontend URL in production (e.g. https://app.example.com)'
    );
  }
  return normalizePublicBaseUrl(DEV_FALLBACK_BASE_URL);
}

/** Whether health checks can report email links as safe for end users (prod always needs APP_BASE_URL). */
function isEmailLinkEnvHealthy() {
  return !isProductionNodeEnv() || isPublicAppUrlSet();
}

function logPublicAppUrlStartupChecks() {
  const explicit = normalizePublicBaseUrl(process.env.APP_BASE_URL);
  if (!explicit) {
    console.warn(
      `[env] APP_BASE_URL is not set. Email links will use the development fallback (${DEV_FALLBACK_BASE_URL}). Set APP_BASE_URL for staging/production.`
    );
    if (isProductionNodeEnv()) {
      console.error(
        '[env] APP_BASE_URL is required in production. Verification and password-reset links will throw until it is set.'
      );
    }
  } else {
    console.log(`[env] APP_BASE_URL=${explicit}`);
  }

  const clientUrl = process.env.CLIENT_URL;
  if (explicit && clientUrl && String(clientUrl).trim() !== '') {
    let appOrigin;
    try {
      appOrigin = new URL(explicit).origin;
    } catch {
      console.warn('[env] APP_BASE_URL is not a valid absolute URL; use e.g. https://your-frontend-domain.com');
      return;
    }
    const parts = String(clientUrl)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let anyMatch = false;
    for (const part of parts) {
      try {
        if (new URL(part).origin === appOrigin) anyMatch = true;
      } catch {
        /* ignore malformed CLIENT_URL entry */
      }
    }
    if (parts.length > 0 && !anyMatch) {
      console.warn(
        `[env] CLIENT_URL should include an origin matching APP_BASE_URL (${appOrigin}). Current CLIENT_URL=${clientUrl}`
      );
    }
  }

  if (isProductionNodeEnv() && (!clientUrl || String(clientUrl).trim() === '')) {
    console.warn(
      '[env] CLIENT_URL is unset; CORS allows any origin. Set CLIENT_URL to your frontend origin in production.'
    );
  }
}

module.exports = {
  DEV_FALLBACK_BASE_URL,
  normalizePublicBaseUrl,
  isProductionNodeEnv,
  isPublicAppUrlSet,
  isEmailLinkEnvHealthy,
  getPublicAppUrlForEmailLinks,
  logPublicAppUrlStartupChecks,
};

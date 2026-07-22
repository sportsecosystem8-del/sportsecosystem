'use strict';

/** Development-only fallback when APP_BASE_URL is unset (local Vite default). */
const DEV_FALLBACK_BASE_URL = 'http://localhost:5173';

function normalizePublicBaseUrl(url) {
  if (url == null || String(url).trim() === '') return '';
  let value = String(url).trim().replace(/\/+$/, '');
  if (!value) return '';
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    if (value.startsWith('//')) {
      value = `https:${value}`;
    } else if (value.includes('localhost') || value.includes('127.0.0.1') || value.startsWith('0.0.0.0')) {
      value = `http://${value}`;
    } else {
      value = `https://${value}`;
    }
  }
  try {
    const parsed = new URL(value);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function getConfiguredPublicBaseUrl() {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.PUBLIC_URL,
    process.env.VERCEL_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.VITE_APP_URL,
  ];
  for (const raw of candidates) {
    if (raw == null || String(raw).trim() === '') continue;
    const firstCandidate = String(raw)
      .split(',')
      .map((value) => normalizePublicBaseUrl(value))
      .find(Boolean);
    if (firstCandidate) return firstCandidate;
  }
  return '';
}

function isProductionNodeEnv() {
  return process.env.NODE_ENV === 'production';
}

/** True when any public frontend URL is configured for email links. */
function isPublicAppUrlSet() {
  return getConfiguredPublicBaseUrl() !== '';
}

/**
 * Base URL for links in outgoing email (verify email, password reset).
 * Production prefers APP_BASE_URL, but will fall back to CLIENT_URL or similar frontend values.
 */
function getPublicAppUrlForEmailLinks() {
  const explicit = getConfiguredPublicBaseUrl();
  if (explicit) return explicit;
  if (isProductionNodeEnv()) {
    throw new Error(
      'A public frontend URL must be set in APP_BASE_URL or CLIENT_URL in production (e.g. https://app.example.com)'
    );
  }
  return normalizePublicBaseUrl(DEV_FALLBACK_BASE_URL);
}

/** Whether health checks can report email links as safe for end users (prod always needs APP_BASE_URL). */
function isEmailLinkEnvHealthy() {
  return !isProductionNodeEnv() || isPublicAppUrlSet();
}

function logPublicAppUrlStartupChecks() {
  const explicit = getConfiguredPublicBaseUrl();
  if (!explicit) {
    console.warn(
      `[env] No public frontend URL is configured. Email links will use the development fallback (${DEV_FALLBACK_BASE_URL}). Set APP_BASE_URL or CLIENT_URL for staging/production.`
    );
    if (isProductionNodeEnv()) {
      console.error(
        '[env] A public frontend URL is required in production. Verification and password-reset links will throw until it is set.'
      );
    }
  } else {
    console.log(`[env] publicFrontendUrl=${explicit}`);
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

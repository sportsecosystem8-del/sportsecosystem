const jwt = require('jsonwebtoken');

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

/** Off in local dev so panels are not blocked during testing. */
const skipLimiter = () => !isProduction || process.env.RATE_LIMIT_DISABLED === 'true';

/** Per IP or per authenticated user (JWT sub) when Bearer token present. */
const apiMax = Number(process.env.RATE_LIMIT_API_MAX) || (isProduction ? 5000 : 0);
const authMax = Number(process.env.RATE_LIMIT_AUTH_MAX) || (isProduction ? 150 : 0);

function rateLimitKey(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(header.slice(7));
      if (decoded?.sub) return `user:${decoded.sub}`;
    } catch {
      // fall through to IP
    }
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLimiter,
  keyGenerator: rateLimitKey,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLimiter,
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  message: { success: false, message: 'Too many authentication attempts.' },
});

module.exports = { apiLimiter, authLimiter };

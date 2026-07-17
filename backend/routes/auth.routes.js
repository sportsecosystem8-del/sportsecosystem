const { Router } = require('express');
const { body, query } = require('express-validator');
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { emailField } = require('./validators');

const r = Router();
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

r.post(
  '/register',
  authLimiter,
  [
    emailField('email'),
    body('password')
      .matches(strongPasswordRegex)
      .withMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      ),
    body('role').isIn(['player', 'coach', 'business_owner']),
    body('profile').isObject(),
    body('profile.locationMapUrl')
      .if(body('role').equals('coach'))
      .trim()
      .notEmpty()
      .withMessage('Google Maps link is required for coaches.')
      .bail()
      .isURL()
      .withMessage('Google Maps link must be a valid URL.'),
    body('profile.address')
      .if(body('role').equals('business_owner'))
      .trim()
      .notEmpty()
      .withMessage('Business address is required.'),
    body('profile.locationMapUrl')
      .if(body('role').equals('business_owner'))
      .trim()
      .notEmpty()
      .withMessage('Google Maps link is required for businesses.')
      .bail()
      .isURL()
      .withMessage('Google Maps link must be a valid URL.'),
  ],
  auth.register
);

r.post('/login', authLimiter, [emailField('email'), body('password').notEmpty()], auth.login);

r.get('/me', authenticate, auth.me);

r.delete(
  '/me',
  authenticate,
  [
    body('password').notEmpty().withMessage('Password is required to delete your account.'),
    body('confirm').trim().notEmpty().withMessage('Confirmation is required.'),
  ],
  auth.deleteMyAccount
);

r.get(
  '/verify-email',
  authLimiter,
  [query('email').trim().isEmail(), query('token').trim().notEmpty()],
  auth.verifyEmail
);

r.post('/resend-verification', authLimiter, [emailField('email')], auth.resendVerification);

r.post(
  '/password-reset-request',
  authLimiter,
  [
    body('email')
      .trim()
      .isEmail({ allow_utf8_local_part: true, require_tld: false })
      .customSanitizer((v) => String(v).toLowerCase()),
    body('role').optional().isIn(['player', 'coach', 'business_owner', 'admin']),
  ],
  auth.passwordResetRequest
);

r.post(
  '/password-reset-confirm',
  authLimiter,
  [
    emailField('email'),
    body('token').trim().notEmpty(),
    body('newPassword')
      .matches(strongPasswordRegex)
      .withMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      ),
  ],
  auth.passwordResetConfirm
);

module.exports = r;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const CoachProfile = require('../models/CoachProfile');
const BusinessProfile = require('../models/BusinessProfile');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendMail, isMailerConfigured } = require('../utils/mailer');
const { queueEmail } = require('../utils/asyncEmail');
const {
  validateScheduleSlots,
  normalizeSkillLevels,
  normalizeSports,
} = require('../utils/scheduleSlots');

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Admin accounts never use passwordHash for login — only ADMIN_PASSWORD in .env. */
function adminLoginPasswordOk(provided) {
  const expected = process.env.ADMIN_PASSWORD;
  if (expected == null || expected === '') return false;
  return String(provided) === expected;
}

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

const { getPublicAppUrlForEmailLinks } = require('../utils/publicAppUrl');
const { deleteUserAccount } = require('../utils/deleteUserAccount');

function frontendBaseUrl() {
  return getPublicAppUrlForEmailLinks();
}

async function sendVerificationEmail(user, rawToken) {
  const verifyUrl = `${frontendBaseUrl()}/verify-email?email=${encodeURIComponent(user.email)}&token=${rawToken}`;
  const subject = 'Verify your Sports Ecosystem account';
  const text = `Welcome! Verify your email by opening this link: ${verifyUrl}`;
  const html = `<p>Welcome to Sports Ecosystem.</p><p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>`;
  await sendMail({ to: user.email, subject, text, html });
}

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${frontendBaseUrl()}/reset-password?email=${encodeURIComponent(user.email)}&token=${rawToken}`;
  const subject = 'Reset your Sports Ecosystem password';
  const text = `Reset your password by opening this link: ${resetUrl}`;
  const html = `<p>We received a password reset request.</p><p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p><p>This link expires in 15 minutes.</p>`;
  await sendMail({ to: user.email, subject, text, html });
}

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { email, password, role, profile } = req.body;
  if (role === 'admin') {
    return res.status(403).json({ success: false, message: 'Cannot register as admin via public API' });
  }
  if (role === 'coach') {
    const specs = profile?.specialties;
    if (!Array.isArray(specs) || specs.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Coach registration requires at least one specialty (cricket or badminton).',
      });
    }
    const allowed = ['cricket', 'badminton'];
    if (!specs.every((s) => allowed.includes(s))) {
      return res.status(400).json({
        success: false,
        message: 'Specialties must be cricket and/or badminton.',
      });
    }
    const mapLink = String(profile?.locationMapUrl || '').trim();
    if (!mapLink) {
      return res.status(400).json({
        success: false,
        message: 'Google Maps link is required for coach registration.',
      });
    }
    try {
      // URL constructor gives stricter URL shape checks than a basic truthy check.
      new URL(mapLink);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Google Maps link must be a valid URL.',
      });
    }
    profile.locationMapUrl = mapLink;
  }
  if (role === 'player' && profile?.sportPreference === 'cricket') {
    const cat = profile?.playerCategory;
    const allowed = ['batsman', 'bowler', 'allrounder'];
    if (!cat || !allowed.includes(cat)) {
      return res.status(400).json({
        success: false,
        message: 'Cricket players must select a playing category (batsman, bowler, or allrounder).',
      });
    }
  }
  if (role === 'business_owner' && (!profile?.businessName || String(profile.businessName).trim() === '')) {
    return res.status(400).json({ success: false, message: 'Business name is required.' });
  }
  if (role === 'business_owner') {
    const address = String(profile?.address || '').trim();
    if (!address) {
      return res.status(400).json({ success: false, message: 'Business address is required.' });
    }
    profile.address = address;
    const mapLink = String(profile?.locationMapUrl || '').trim();
    if (!mapLink) {
      return res.status(400).json({ success: false, message: 'Google Maps link is required for business registration.' });
    }
    try {
      new URL(mapLink);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Google Maps link must be a valid URL.' });
    }
    profile.locationMapUrl = mapLink;
  }
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let verificationStatus = 'pending_review';
  if (role === 'player') verificationStatus = 'verified';

  const user = await User.create({
    email: String(email).toLowerCase(),
    passwordHash,
    role,
    verificationStatus,
    emailVerified: false,
  });

  if (role === 'player') {
    let trainingPreferences = [];
    if (profile.trainingPreferences !== undefined) {
      const check = validateScheduleSlots(profile.trainingPreferences);
      if (!check.ok) return res.status(400).json({ success: false, message: check.message });
      trainingPreferences = check.slots;
    }
    const pp = await PlayerProfile.create({
      user: user._id,
      fullName: profile.fullName,
      phone: profile.phone,
      sportPreference: profile.sportPreference,
      skillLevel: profile.skillLevel || 'beginner',
      playerCategory:
        profile.sportPreference === 'cricket' ? profile.playerCategory || undefined : undefined,
      trainingPreferences,
      city: profile.city,
      address: profile.address,
    });
    user.playerProfile = pp._id;
    await user.save();
  } else if (role === 'coach') {
    let availability = [];
    if (profile.availability !== undefined) {
      const check = validateScheduleSlots(profile.availability);
      if (!check.ok) return res.status(400).json({ success: false, message: check.message });
      availability = check.slots;
    }
    const cp = await CoachProfile.create({
      user: user._id,
      fullName: profile.fullName,
      phone: profile.phone,
      specialties: normalizeSports(profile.specialties || []),
      preferredPlayerLevels: normalizeSkillLevels(profile.preferredPlayerLevels || []),
      academyLocation: profile.academyLocation,
      academyName: profile.academyName ? String(profile.academyName).trim() : undefined,
      city: profile.city,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience || 0,
      availability,
      locationMapUrl: profile.locationMapUrl,
    });
    user.coachProfile = cp._id;
    await user.save();
  } else if (role === 'business_owner') {
    const bp = await BusinessProfile.create({
      user: user._id,
      businessName: profile.businessName,
      address: profile.address,
      phone: profile.phone,
      storeName: profile.storeName || profile.businessName,
      storeDescription: profile.storeDescription,
      locationMapUrl: profile.locationMapUrl,
      freeTrialListingsGranted: BusinessProfile.FREE_TRIAL_LISTINGS,
      listingSlotsRemaining: BusinessProfile.FREE_TRIAL_LISTINGS,
    });
    user.businessProfile = bp._id;
    await user.save();
  }

  const rawToken = makeToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
  await user.save();
  if (isMailerConfigured()) {
    queueEmail(() => sendVerificationEmail(user, rawToken));
  }

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        emailVerified: user.emailVerified,
      },
    },
    message: 'Registration successful. Please check your email to verify your account.',
  });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const ok =
    user.role === 'admin'
      ? adminLoginPasswordOk(password)
      : await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  if (user.role !== 'admin' && !user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before signing in. You can request a new verification email.',
    });
  }
  if (user.isSuspended) {
    return res.status(403).json({ success: false, message: 'Account suspended' });
  }
  const token = signToken(user);
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        emailVerified: user.emailVerified,
      },
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('playerProfile')
    .populate('coachProfile')
    .populate('businessProfile')
    .lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  delete user.passwordHash;
  res.json({ success: true, data: user });
});

const passwordResetRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { email, role } = req.body;
  const normalized = String(email || '').toLowerCase();
  const user = await User.findOne({ email: normalized });
  if (user && (!role || user.role === role)) {
    const rawToken = makeToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
    await user.save();
    if (isMailerConfigured()) {
      queueEmail(() => sendPasswordResetEmail(user, rawToken));
    }
  }
  res.json({
    success: true,
    message: 'If an account exists for this email, password reset instructions have been sent.',
    data: { email: normalized },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const email = String(req.query.email || '').toLowerCase();
  const token = String(req.query.token || '');
  if (!email || !token) {
    return res.status(400).json({ success: false, message: 'email and token are required' });
  }
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
  if (user.emailVerified) {
    return res.json({ success: true, message: 'Email already verified. You can sign in.' });
  }
  if (!user.emailVerificationTokenHash || !user.emailVerificationExpiresAt) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
  }
  if (user.emailVerificationTokenHash !== hashToken(token) || user.emailVerificationExpiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
  }
  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  res.json({ success: true, message: 'Email verified successfully. You can now sign in.' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const email = String(req.body.email || '').toLowerCase();
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
  }
  if (user.emailVerified) {
    return res.json({ success: true, message: 'Email is already verified.' });
  }
  const rawToken = makeToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
  await user.save();
  if (isMailerConfigured()) {
    queueEmail(() => sendVerificationEmail(user, rawToken));
  }
  res.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
});

const passwordResetConfirm = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const email = String(req.body.email || '').toLowerCase();
  const token = String(req.body.token || '');
  const newPassword = String(req.body.newPassword || '');
  const user = await User.findOne({ email });
  if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
  }
  if (user.passwordResetTokenHash !== hashToken(token) || user.passwordResetExpiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  res.json({ success: true, message: 'Password has been reset successfully.' });
});

/** Permanently delete the authenticated user's account so the same email can register again. */
const deleteMyAccount = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted this way.' });
  }

  const password = String(req.body.password || '');
  const confirm = String(req.body.confirm || '').trim().toUpperCase();
  if (confirm !== 'DELETE') {
    return res.status(400).json({
      success: false,
      message: 'Type DELETE to confirm permanent account deletion.',
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  const deleted = await deleteUserAccount(user._id);
  res.json({
    success: true,
    message: 'Account deleted permanently. You can register again with the same email.',
    data: { email: deleted.email },
  });
});

module.exports = {
  register,
  login,
  me,
  passwordResetRequest,
  passwordResetConfirm,
  verifyEmail,
  resendVerification,
  deleteMyAccount,
  signToken,
};

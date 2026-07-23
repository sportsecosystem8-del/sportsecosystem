const { validationResult } = require('express-validator');
const User = require('../models/User');
const CoachProfile = require('../models/CoachProfile');
const PlayerProfile = require('../models/PlayerProfile');
const TrainingRequest = require('../models/TrainingRequest');
const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');
const AttendanceRecord = require('../models/AttendanceRecord');
const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const IndoorGround = require('../models/IndoorGround');
const GroundBooking = require('../models/GroundBooking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const VerificationDocument = require('../models/VerificationDocument');
const CoachFeedback = require('../models/CoachFeedback');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const { asyncHandler } = require('../utils/asyncHandler');
const { resolveUserRefId } = require('../utils/objectId');
const { hasOverlap } = require('../utils/groundBookings');
const {
  GROUND_BOOKING_CURRENCY,
  GROUND_BOOKING_MIN_PKR,
  groundBookingAmountToMinor,
  isValidGroundBookingStripeAmount,
} = require('../utils/groundBookingCurrency');
const { notifyUser } = require('../utils/notify');
const {
  validateScheduleSlots,
  normalizeSkillLevels,
  normalizeSports,
} = require('../utils/scheduleSlots');
const {
  getStripe,
  isStripeEnabled,
  dollarsToCents,
  retrieveSucceededPaymentIntent,
  assertAmountMatches,
  paymentIntentMethodSpec,
} = require('../utils/stripePayments');
const { generateTrainingPlanDraft, providerConfig } = require('../services/aiCoachEngine');
const { deriveLegacyScores, evaluationSummaryScore, normalizeSkillScores } = require('../utils/evaluationScores');
const { getEvaluationRubric, listEvaluationRubrics } = require('../data/evaluationRubrics');
const {
  analyzeSkillGaps,
  buildPersonalizedPlanFromGaps,
  buildPlayerInsights,
  evaluationHasSkillBreakdown,
  planPublishNotification,
} = require('../utils/skillGapAnalysis');
const {
  coachPlatformSubscriptionActive,
  getCoachPlatformSubscriptionPricePkr,
  getCoachPlatformSubscriptionPriceUsd,
} = require('../utils/coachPlatformSubscription');
const { formatMeetingWhen, buildMeetingInstructions } = require('../utils/trainingRequestMessages');
const { normalizeCoachRollNo } = require('../utils/coachRollNo');
const { streamVerificationDocumentFile } = require('../utils/streamVerificationDocument');
const { getBusinessOwnerPaymentAccount } = require('../utils/ownerPaymentAccount');
const {
  generateOrderRef,
  buildEasypaisaCheckoutSession,
  verifyEasypaisaPayment,
} = require('../utils/easypaisaPayments');
const { finalizeGroundBookingConfirm } = require('../utils/atomicBooking');

async function verifyCoachPlatformSubscriptionPI(paymentIntentId, userId, action, amountPkr) {
  const pi = await retrieveSucceededPaymentIntent(paymentIntentId);
  if (pi.metadata.purpose !== 'coach_platform_subscription' || pi.metadata.userId !== String(userId)) {
    const err = new Error('Invalid payment');
    err.statusCode = 400;
    throw err;
  }
  if (pi.metadata.action !== action) {
    const err = new Error('Invalid payment action');
    err.statusCode = 400;
    throw err;
  }
  assertAmountMatches(pi, dollarsToCents(amountPkr));
}

async function extendCoachPlatformPeriod(userId) {
  const cp = await CoachProfile.findOne({ user: userId });
  if (!cp) return null;
  const base = new Date();
  const current = cp.platformSubscriptionRenewsAt ? new Date(cp.platformSubscriptionRenewsAt) : null;
  if (current && current.getTime() > base.getTime()) {
    base.setTime(current.getTime());
  }
  base.setMonth(base.getMonth() + 1);
  cp.platformSubscriptionRenewsAt = base;
  await cp.save();
  return cp;
}

/** Block only when the same player already has an overlapping session */
async function sessionConflicts(coachId, playerId, scheduledAt, durationMinutes, excludeSessionId = null) {
  const startMs = new Date(scheduledAt).getTime();
  const duration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : SESSION_DURATION_MINUTES;
  const endMs = startMs + duration * 60 * 1000;
  const query = {
    coach: coachId,
    player: playerId,
    status: { $in: ['scheduled'] },
  };
  if (excludeSessionId) query._id = { $ne: excludeSessionId };
  const sessions = await TrainingSession.find(query).select('scheduledAt durationMinutes').lean();
  return sessions.some((s) => {
    const sStart = new Date(s.scheduledAt).getTime();
    const sDur = s.durationMinutes ?? SESSION_DURATION_MINUTES;
    const sEnd = sStart + sDur * 60 * 1000;
    return startMs < sEnd && endMs > sStart;
  });
}

async function resolveCoachSessionDuration(coachId, requestedMinutes) {
  if (Number.isFinite(requestedMinutes) && requestedMinutes >= 15 && requestedMinutes <= 240) {
    return Math.round(requestedMinutes);
  }
  const cp = await CoachProfile.findOne({ user: coachId }).select('defaultSessionDurationMinutes').lean();
  const fallback = cp?.defaultSessionDurationMinutes ?? SESSION_DURATION_MINUTES;
  return Math.min(240, Math.max(15, fallback));
}

const SESSION_DURATION_MINUTES = 60;

async function assertAcceptedStudent(coachId, playerId) {
  const accepted = await TrainingRequest.findOne({
    coach: coachId,
    player: playerId,
    status: 'accepted',
  }).lean();
  if (!accepted) {
    const err = new Error('This player is not an accepted student yet.');
    err.statusCode = 403;
    throw err;
  }
  return accepted;
}

/** Roster / fee ledger: accepted + fees cleared only. */
async function assertActiveStudent(coachId, playerId) {
  const active = await TrainingRequest.findOne({
    coach: coachId,
    player: playerId,
    status: 'accepted',
    feesClearedAt: { $ne: null },
  }).lean();
  if (!active) {
    const err = new Error('This player is not an active student yet (accept and clear fees first).');
    err.statusCode = 403;
    throw err;
  }
  return active;
}

async function assertFeesCleared(coachId, playerId) {
  const tr = await TrainingRequest.findOne({
    coach: coachId,
    player: playerId,
    status: 'accepted',
  }).lean();
  if (!tr || tr.feesClearedAt) return;
  const err = new Error('Clear student training fees before scheduling sessions.');
  err.statusCode = 400;
  throw err;
}

async function scheduleTrainingSession({
  coachId,
  playerId,
  scheduledAt,
  trainingRequestId,
  location,
  skipFeesCheck = false,
  durationMinutes,
}) {
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    const err = new Error('Invalid schedule time.');
    err.statusCode = 400;
    throw err;
  }
  if (when.getTime() < Date.now() - 60_000) {
    const err = new Error('Schedule time must be in the future.');
    err.statusCode = 400;
    throw err;
  }

  const accepted = await assertAcceptedStudent(coachId, playerId);

  if (!skipFeesCheck) {
    await assertFeesCleared(coachId, playerId);
  }

  const duration = await resolveCoachSessionDuration(coachId, durationMinutes);

  if (await sessionConflicts(coachId, playerId, when, duration)) {
    const err = new Error('This player already has a session overlapping that time.');
    err.statusCode = 409;
    throw err;
  }

  const cp = await CoachProfile.findOne({ user: coachId }).lean();

  const active = await TrainingSession.countDocuments({ coach: coachId, status: 'scheduled' });
  const cap = cp?.maxStudents ?? 40;
  if (active >= cap) {
    const err = new Error(`Maximum scheduled sessions (${cap}) reached.`);
    err.statusCode = 409;
    throw err;
  }

  return TrainingSession.create({
    coach: coachId,
    player: playerId,
    trainingRequest: trainingRequestId || accepted._id,
    scheduledAt: when,
    durationMinutes: duration,
    location: location ? String(location).trim() : undefined,
    status: 'scheduled',
  });
}

function mondayOfDate(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const n = new Date(date);
  n.setDate(diff);
  n.setHours(0, 0, 0, 0);
  return n;
}

function aiTrainingPlanEnabled() {
  return String(process.env.AI_TRAINING_PLAN_ENABLED || 'true') !== 'false';
}

function classifyAiFallbackReason(message) {
  const m = String(message || '').toLowerCase();
  if (!m) return 'unknown';
  if (m.includes('(401)') || m.includes('incorrect api key') || m.includes('missing')) return 'auth_failed';
  if (m.includes('(429)') || m.includes('rate limit') || m.includes('quota')) return 'rate_limited';
  if (m.includes('abort') || m.includes('timeout')) return 'timeout';
  if (m.includes('invalid ai training plan payload') || m.includes('json')) return 'invalid_payload';
  if (m.includes('(400)') || m.includes('model')) return 'bad_request_or_model';
  if (m.includes('(5')) return 'provider_server_error';
  return 'provider_error';
}

/** AI/rules weekly draft for one accepted student. ifExists: skip | error | replace */
async function createAutoWeeklyPlanDraft(coachId, playerId, referenceDate = new Date(), { ifExists = 'replace' } = {}) {
  const accepted = await TrainingRequest.findOne({
    coach: coachId,
    player: playerId,
    status: 'accepted',
  }).lean();
  if (!accepted) {
    const err = new Error('This player has not accepted training with you yet.');
    err.statusCode = 400;
    throw err;
  }

  const weekStart = mondayOfDate(referenceDate);
  const existingDraft = await TrainingPlan.findOne({
    coach: coachId,
    player: playerId,
    weekStartDate: weekStart,
    status: 'draft',
    isAutoGenerated: true,
  });
  if (existingDraft) {
    if (ifExists === 'replace') {
      await TrainingPlan.deleteOne({ _id: existingDraft._id });
    } else if (ifExists === 'skip') {
      return { plan: existingDraft, created: false, replaced: false };
    } else {
      const err = new Error('An auto draft already exists for this student and week.');
      err.statusCode = 409;
      throw err;
    }
  }

  let aiDraft = null;
  let fallbackReasonCode = 'none';
  const [playerUser, playerProfile, recentPerf, recentAttendance] = await Promise.all([
    User.findById(playerId).select('email').lean(),
    PlayerProfile.findOne({ user: playerId }).lean(),
    PerformanceEvaluation.find({ player: playerId, coach: coachId }).sort({ weekStartDate: -1 }).limit(4).lean(),
    AttendanceRecord.find({ player: playerId, coach: coachId }).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const latestEval = recentPerf.find((row) => evaluationHasSkillBreakdown(row)) || null;
  if (!latestEval) {
    const err = new Error(
      'Complete a sport-specific evaluation first (Evaluations page — score all sub-techniques) before generating a weekly plan.'
    );
    err.statusCode = 400;
    err.code = 'EVALUATION_REQUIRED';
    throw err;
  }

  const sport = latestEval.sport || playerProfile?.sportPreference || 'cricket';
  const skillGaps = analyzeSkillGaps(latestEval.skillScores, sport);
  const draftPlayerName = playerProfile?.fullName || playerUser?.email || 'Player';
  const rulesPlan = buildPersonalizedPlanFromGaps({
    playerName: draftPlayerName,
    sport,
    gapAnalysis: skillGaps,
    evaluationDate: latestEval.weekStartDate,
  });
  const playerInsights = buildPlayerInsights(skillGaps);

  if (aiTrainingPlanEnabled()) {
    try {
      aiDraft = await generateTrainingPlanDraft({
        weekStartDate: weekStart.toISOString(),
        player: {
          email: playerUser?.email || '',
          fullName: playerProfile?.fullName || '',
          sportPreference: sport,
          skillLevel: playerProfile?.skillLevel || '',
          playerCategory: playerProfile?.playerCategory || '',
          city: playerProfile?.city || '',
        },
        latestEvaluation: {
          weekStartDate: latestEval.weekStartDate,
          overallScore: latestEval.overallScore,
          categoryAverages: latestEval.categoryAverages,
          skillScores: latestEval.skillScores,
          comments: latestEval.comments || '',
        },
        skillGaps: {
          overallAvg: skillGaps.overallAvg,
          categoryAvgs: skillGaps.categoryAvgs,
          critical: skillGaps.critical,
          needsWork: skillGaps.needsWork,
          strong: skillGaps.strong,
          focusSkills: skillGaps.focusSkills,
        },
        performance: recentPerf.map((r) => ({
          weekStartDate: r.weekStartDate,
          overallScore: r.overallScore,
          technique: r.technique,
          fitness: r.fitness,
          attitude: r.attitude,
          skillScores: r.skillScores || [],
          categoryAverages: r.categoryAverages || {},
          comments: r.comments || '',
        })),
        attendance: recentAttendance.map((r) => ({
          present: r.present,
          notes: r.notes || '',
          at: r.createdAt,
        })),
      });
    } catch (e) {
      fallbackReasonCode = classifyAiFallbackReason(e.message);
      const cfg = providerConfig();
      console.warn(
        `[ai][training-plan] fallback to rules draft: reason=${fallbackReasonCode} provider=${cfg.provider} model=${cfg.planModel} msg=${e.message}`
      );
    }
  }

  const plan = await TrainingPlan.create({
    coach: coachId,
    player: playerId,
    weekStartDate: weekStart,
    title: aiDraft?.title || rulesPlan.title,
    analysisSummary: aiDraft?.analysisSummary || rulesPlan.analysisSummary,
    goals: aiDraft?.goals || rulesPlan.goals,
    exercises: aiDraft?.exercises || rulesPlan.exercises,
    focusSkills: rulesPlan.focusSkills,
    playerInsights,
    status: 'draft',
    isAutoGenerated: true,
    coachReviewed: false,
    generationMethod: aiDraft ? 'ai' : 'rules',
    generationMeta: aiDraft
      ? {
          provider: aiDraft.provider,
          model: aiDraft.model,
          generatedAt: new Date(),
          latencyMs: aiDraft.latencyMs,
          evaluationWeek: latestEval.weekStartDate,
          evaluationId: String(latestEval._id),
        }
      : {
          provider: 'rules',
          model: 'skill-gap-engine',
          generatedAt: new Date(),
          reasonCode: fallbackReasonCode,
          evaluationWeek: latestEval.weekStartDate,
          evaluationId: String(latestEval._id),
        },
  });
  return { plan, created: true, replaced: Boolean(existingDraft) };
}

async function publishPlanToPlayer(plan) {
  if (!plan || plan.status === 'published') return plan;
  plan.status = 'published';
  plan.coachReviewed = true;
  await plan.save();
  try {
    const note = planPublishNotification(plan);
    await notifyUser(plan.player, note);
  } catch (e) {
    console.warn('[notify][training-plan-published] failed:', e.message);
  }
  return plan;
}

const populatePlayerBrief = {
  path: 'player',
  select: 'email',
  populate: {
    path: 'playerProfile',
    select: 'fullName phone city address latitude longitude sportPreference skillLevel playerCategory profilePhotoUrl',
  },
};

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('coachProfile').lean();
  if (!user?.coachProfile) return res.status(404).json({ success: false, message: 'Profile not found' });
  const pricePkr = await getCoachPlatformSubscriptionPricePkr();
  const subscriptionActive = pricePkr <= 0 || coachPlatformSubscriptionActive(user.coachProfile);
  res.json({
    success: true,
    data: {
      ...user.coachProfile,
      subscriptionActive,
      platformSubscriptionPricePkr: pricePkr,
      platformSubscriptionPriceUsd: pricePkr,
    },
  });
});

const getCoachSubscriptionStatus = asyncHandler(async (req, res) => {
  const cp = await CoachProfile.findOne({ user: req.user.id }).lean();
  if (!cp) return res.status(404).json({ success: false, message: 'Profile not found' });
  const pricePkr = await getCoachPlatformSubscriptionPricePkr();
  res.json({
    success: true,
    data: {
      active: pricePkr <= 0 || coachPlatformSubscriptionActive(cp),
      pricePkr,
      priceUsd: pricePkr,
      renewsAt: cp.platformSubscriptionRenewsAt || null,
    },
  });
});

const createCoachSubscriptionPaymentIntent = asyncHandler(async (req, res) => {
  if (!isStripeEnabled()) {
    return res.status(503).json({ success: false, message: 'Stripe is not configured on the server.' });
  }
  const { action } = req.body;
  if (!['subscribe', 'renew'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be subscribe or renew' });
  }
  const amountPkr = await getCoachPlatformSubscriptionPricePkr();
  if (amountPkr <= 0) {
    return res.status(400).json({ success: false, message: 'Platform price is zero — no payment required.' });
  }
  const amountMinor = dollarsToCents(amountPkr);
  if (amountPkr < 50) {
    return res.status(400).json({
      success: false,
      message: 'Amount below Stripe minimum (PKR 50). Increase coach_platform_subscription_pkr in Admin → Settings.',
    });
  }
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: amountMinor,
    currency: 'pkr',
    ...paymentIntentMethodSpec(),
    metadata: {
      purpose: 'coach_platform_subscription',
      action,
      userId: String(req.user.id),
      amountMinor: String(amountMinor),
    },
  });
  res.json({
    success: true,
    data: { clientSecret: pi.client_secret, amount: amountPkr, action, currency: 'pkr' },
  });
});

const subscribeCoachPlatform = asyncHandler(async (req, res) => {
  const { paymentIntentId, cardLast4 } = req.body;
  const amountUsd = await getCoachPlatformSubscriptionPriceUsd();
  if (amountUsd <= 0) {
    const profile = await extendCoachPlatformPeriod(req.user.id);
    return res.json({
      success: true,
      data: { profile, skippedPayment: true },
    });
  }
  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required when Stripe is enabled.' });
    }
    try {
      await verifyCoachPlatformSubscriptionPI(paymentIntentId, req.user.id, 'subscribe', amountUsd);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }
  }
  await Payment.create({
    payer: req.user.id,
    type: 'subscription',
    amount: amountUsd,
    status: 'completed',
    externalRef: isStripeEnabled() ? paymentIntentId : 'mock-coach-platform-sub',
    meta: { context: 'coach_platform', cardLast4: cardLast4 || 'mock', invoiceRef: `COACH-SUB-${Date.now()}` },
  });
  const profile = await extendCoachPlatformPeriod(req.user.id);
  await notifyUser(req.user.id, {
    title: 'Coach platform subscription',
    body: `Monthly access active until ${new Date(profile.platformSubscriptionRenewsAt).toLocaleDateString()}.`,
    category: 'subscription',
  });
  res.json({ success: true, data: { profile } });
});

const renewCoachPlatform = asyncHandler(async (req, res) => {
  const { paymentIntentId, cardLast4 } = req.body;
  const amountUsd = await getCoachPlatformSubscriptionPriceUsd();
  if (amountUsd <= 0) {
    const profile = await extendCoachPlatformPeriod(req.user.id);
    return res.json({ success: true, data: { profile, skippedPayment: true } });
  }
  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required when Stripe is enabled.' });
    }
    try {
      await verifyCoachPlatformSubscriptionPI(paymentIntentId, req.user.id, 'renew', amountUsd);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }
  }
  await Payment.create({
    payer: req.user.id,
    type: 'subscription',
    amount: amountUsd,
    status: 'completed',
    externalRef: isStripeEnabled() ? paymentIntentId : 'mock-coach-platform-renew',
    meta: { context: 'coach_platform', cardLast4: cardLast4 || 'mock', invoiceRef: `COACH-REN-${Date.now()}` },
  });
  const profile = await extendCoachPlatformPeriod(req.user.id);
  await notifyUser(req.user.id, {
    title: 'Subscription renewed',
    body: `Extended until ${new Date(profile.platformSubscriptionRenewsAt).toLocaleDateString()}.`,
    category: 'subscription',
  });
  res.json({ success: true, data: { profile } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const allowed = [
    'fullName',
    'phone',
    'bio',
    'city',
    'academyLocation',
    'academyName',
    'latitude',
    'longitude',
    'yearsExperience',
    'maxStudents',
    'specialties',
    'preferredPlayerLevels',
    'coachingCategories',
    'defaultSessionDurationMinutes',
    'availability',
    'monthlyTrainingFee',
    'academyImageUrls',
  ];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (req.body.specialties !== undefined) {
    const specialties = normalizeSports(req.body.specialties);
    if (Array.isArray(req.body.specialties) && req.body.specialties.length > 0 && specialties.length === 0) {
      return res.status(400).json({ success: false, message: 'Choose at least one valid sport specialty.' });
    }
    patch.specialties = specialties;
  }
  if (req.body.preferredPlayerLevels !== undefined) {
    patch.preferredPlayerLevels = normalizeSkillLevels(req.body.preferredPlayerLevels);
  }
  if (req.body.coachingCategories !== undefined) {
    const allowed = ['batsman', 'bowler', 'allrounder'];
    const raw = Array.isArray(req.body.coachingCategories) ? req.body.coachingCategories : [];
    patch.coachingCategories = raw.filter((c) => allowed.includes(c));
  }
  if (req.body.defaultSessionDurationMinutes !== undefined) {
    const mins = Number.parseInt(req.body.defaultSessionDurationMinutes, 10);
    if (Number.isFinite(mins)) {
      patch.defaultSessionDurationMinutes = Math.min(240, Math.max(15, mins));
    }
  }
  if (req.body.availability !== undefined) {
    const check = validateScheduleSlots(req.body.availability);
    if (!check.ok) return res.status(400).json({ success: false, message: check.message });
    patch.availability = check.slots;
  }
  if (req.body.locationMapUrl !== undefined) {
    const mapLink = String(req.body.locationMapUrl || '').trim();
    if (!mapLink || !/^https?:\/\//i.test(mapLink)) {
      return res.status(400).json({ success: false, message: 'Valid Google Maps URL required.' });
    }
    patch.locationMapUrl = mapLink;
  }
  if (req.body.yearsExperience !== undefined) {
    const years = Number.parseInt(req.body.yearsExperience, 10);
    patch.yearsExperience = Number.isFinite(years) && years >= 0 ? years : 0;
  }
  if (req.body.monthlyTrainingFee !== undefined) {
    const fee = Number(req.body.monthlyTrainingFee);
    patch.monthlyTrainingFee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
  }
  if (req.body.latitude !== undefined) {
    const { parseCoord } = require('../utils/geo');
    if (req.body.latitude === null || req.body.latitude === '') patch.latitude = undefined;
    else {
      const lat = parseCoord(req.body.latitude);
      if (lat === undefined) return res.status(400).json({ success: false, message: 'Invalid latitude.' });
      patch.latitude = lat;
    }
  }
  if (req.body.longitude !== undefined) {
    const { parseCoord } = require('../utils/geo');
    if (req.body.longitude === null || req.body.longitude === '') patch.longitude = undefined;
    else {
      const lng = parseCoord(req.body.longitude);
      if (lng === undefined) return res.status(400).json({ success: false, message: 'Invalid longitude.' });
      patch.longitude = lng;
    }
  }
  if (req.body.academyImageUrls !== undefined) {
    if (!Array.isArray(req.body.academyImageUrls)) {
      return res.status(400).json({ success: false, message: 'academyImageUrls must be an array of image paths.' });
    }
    patch.academyImageUrls = req.body.academyImageUrls
      .map((u) => String(u || '').trim())
      .filter((u) => u.startsWith('/uploads/'))
      .slice(0, 12);
  }
  const profile = await CoachProfile.findOneAndUpdate({ user: req.user.id }, patch, { new: true });
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: profile });
});

const uploadProfilePhoto = asyncHandler(async (req, res) => {
  let url = '';
  if (req.file) {
    url = `/uploads/${req.file.filename}`;
  } else if (req.body.profilePhotoUrl && typeof req.body.profilePhotoUrl === 'string') {
    url = req.body.profilePhotoUrl.trim();
  }
  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'No image received. Choose a JPG/PNG/WebP file under 8 MB.',
    });
  }
  const profile = await CoachProfile.findOneAndUpdate(
    { user: req.user.id },
    { profilePhotoUrl: url },
    { new: true }
  );
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: profile });
});

const removeProfilePhoto = asyncHandler(async (req, res) => {
  const profile = await CoachProfile.findOneAndUpdate(
    { user: req.user.id },
    { $unset: { profilePhotoUrl: '' } },
    { new: true }
  );
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: profile });
});

const uploadAcademyPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image received. Choose a JPG/PNG/WebP file under 8 MB.',
    });
  }
  const url = `/uploads/${req.file.filename}`;
  const profile = await CoachProfile.findOne({ user: req.user.id });
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  const urls = Array.isArray(profile.academyImageUrls) ? [...profile.academyImageUrls] : [];
  if (urls.length >= 12) {
    return res.status(400).json({ success: false, message: 'Maximum 12 academy photos allowed.' });
  }
  urls.push(url);
  profile.academyImageUrls = urls;
  await profile.save();
  res.json({ success: true, data: profile });
});

const removeAcademyPhoto = asyncHandler(async (req, res) => {
  const url = String(req.body?.url || '').trim();
  if (!url) return res.status(400).json({ success: false, message: 'url is required' });
  const profile = await CoachProfile.findOneAndUpdate(
    { user: req.user.id },
    { $pull: { academyImageUrls: url } },
    { new: true }
  );
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: profile });
});

const updateAvailability = asyncHandler(async (req, res) => {
  const check = validateScheduleSlots(req.body.availability);
  if (!check.ok) return res.status(400).json({ success: false, message: check.message });
  const profile = await CoachProfile.findOneAndUpdate(
    { user: req.user.id },
    { availability: check.slots },
    { new: true }
  );
  res.json({ success: true, data: profile });
});

const listTrainingRequests = asyncHandler(async (req, res) => {
  const list = await TrainingRequest.find({ coach: req.user.id })
    .populate(populatePlayerBrief)
    .sort({ createdAt: -1 })
    .lean();

  const playerIds = [...new Set(list.map((row) => resolveUserRefId(row.player)).filter(Boolean))];
  let latestByPlayer = new Map();
  if (playerIds.length) {
    const perfRows = await PerformanceEvaluation.find({ player: { $in: playerIds }, coach: req.user.id })
      .sort({ weekStartDate: -1 })
      .lean();
    for (const row of perfRows) {
      const key = resolveUserRefId(row.player);
      if (!key || latestByPlayer.has(key)) continue;
      latestByPlayer.set(key, row);
    }
  }

  const cp = await CoachProfile.findOne({ user: req.user.id }).lean();

  const data = list.map((row) => {
    const playerId = resolveUserRefId(row.player) || '';
    const latest = latestByPlayer.get(playerId);
    return {
      ...row,
      meetingInstructions:
        row.status === 'accepted' ? buildMeetingInstructions(row, cp) : null,
      feesCleared: Boolean(row.feesClearedAt),
      sessionStarted: Boolean(row.firstSession),
      latestPerformance: latest
        ? {
            technique: latest.technique,
            fitness: latest.fitness,
            attitude: latest.attitude,
            overallScore: latest.overallScore,
            weekStartDate: latest.weekStartDate,
            hasSkillEvaluation: evaluationHasSkillBreakdown(latest),
            skillScoreCount: latest.skillScores?.length || 0,
          }
        : null,
    };
  });

  res.json({ success: true, data });
});

const updateTrainingRequest = asyncHandler(async (req, res) => {
  const { status, scheduledAt, meetingLocation, meetingAcademyName } = req.body;
  const tr = await TrainingRequest.findOne({ _id: req.params.id, coach: req.user.id });
  if (!tr) return res.status(404).json({ success: false, message: 'Request not found' });
  if (status === 'accepted') {
    if (tr.status === 'accepted') {
      const cp = await CoachProfile.findOne({ user: req.user.id }).lean();
      return res.json({
        success: true,
        data: {
          request: tr,
          session: null,
          meetingInstructions: buildMeetingInstructions(tr, cp),
          schedulingNote: 'Request is already accepted.',
        },
      });
    }
    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Select a meeting date and time when accepting the request.',
      });
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid meeting time.' });
    }
    if (when.getTime() < Date.now() - 60_000) {
      return res.status(400).json({ success: false, message: 'Meeting time must be in the future.' });
    }
    const cp = await CoachProfile.findOne({ user: req.user.id }).lean();
    tr.status = 'accepted';
    tr.meetingAt = when;
    tr.meetingLocation =
      (meetingLocation && String(meetingLocation).trim()) || cp?.academyLocation || cp?.city || '';
    tr.meetingAcademyName =
      (meetingAcademyName && String(meetingAcademyName).trim()) ||
      cp?.academyName ||
      cp?.fullName ||
      '';
    await tr.save();

    const meetingInstructions = buildMeetingInstructions(tr, cp);
    try {
      await notifyUser(tr.player, {
        title: 'Training request accepted',
        body: meetingInstructions,
        category: 'training',
      });
    } catch (e) {
      console.warn('[notify][training-accepted] failed:', e.message);
    }
    return res.json({
      success: true,
      data: {
        request: tr,
        session: null,
        meetingInstructions,
        schedulingNote: meetingInstructions,
      },
    });
  }
  tr.status = status;
  await tr.save();
  if (status === 'rejected') {
    try {
      await notifyUser(tr.player, { title: 'Training declined', body: 'Your request was declined.', category: 'training' });
    } catch (e) {
      console.warn('[notify][training-rejected] failed:', e.message);
    }
  }
  res.json({ success: true, data: tr });
});

const markTrainingFeesCleared = asyncHandler(async (req, res) => {
  const tr = await TrainingRequest.findOne({
    _id: req.params.id,
    coach: req.user.id,
    status: 'accepted',
  });
  if (!tr) return res.status(404).json({ success: false, message: 'Accepted request not found' });

  const roll = normalizeCoachRollNo(req.body?.coachRollNo ?? tr.coachRollNo);
  if (!roll) {
    return res.status(400).json({
      success: false,
      message: 'Assign a unique roll number / student ID when marking fees cleared.',
    });
  }

  const duplicate = await TrainingRequest.findOne({
    coach: req.user.id,
    coachRollNo: roll,
    _id: { $ne: tr._id },
  });
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: `Roll number "${roll}" is already assigned to another student.`,
    });
  }

  if (!tr.feesClearedAt) {
    tr.feesClearedAt = new Date();
    tr.coachRollNo = roll;
    await tr.save();
    await StudentFeeRecord.findOneAndUpdate(
      { coach: req.user.id, player: tr.player },
      { $set: { lastPaidAt: new Date() } }
    );
    try {
      await notifyUser(tr.player, {
        title: 'Training fees recorded',
        body: `Your coach marked your fees as cleared. Your student ID is #${roll}. Schedule your first training session from the Sessions page.`,
        category: 'training',
      });
    } catch (e) {
      console.warn('[notify][fees-cleared] failed:', e.message);
    }
  } else if (tr.coachRollNo !== roll) {
    tr.coachRollNo = roll;
    await tr.save();
  }

  res.json({ success: true, data: tr });
});

const startTrainingFromRequest = asyncHandler(async (req, res) => {
  const { scheduledAt, durationMinutes, location } = req.body;
  const tr = await TrainingRequest.findOne({
    _id: req.params.id,
    coach: req.user.id,
    status: 'accepted',
  });
  if (!tr) return res.status(404).json({ success: false, message: 'Accepted request not found' });
  if (!tr.feesClearedAt) {
    return res.status(400).json({
      success: false,
      message: 'Mark student fees as cleared before scheduling the first session.',
    });
  }
  if (!scheduledAt) {
    return res.status(400).json({
      success: false,
      message: 'Pick a training session date and time (separate from the academy meeting).',
    });
  }
  if (tr.firstSession) {
    const existing = await TrainingSession.findById(tr.firstSession).populate(populatePlayerBrief).lean();
    return res.json({
      success: true,
      data: { request: tr, session: existing },
      message: 'First session already created.',
    });
  }
  let session;
  try {
    session = await scheduleTrainingSession({
      coachId: req.user.id,
      playerId: tr.player,
      scheduledAt,
      trainingRequestId: tr._id,
      location: location || tr.meetingLocation,
      skipFeesCheck: true,
      durationMinutes,
    });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ success: false, message: e.message });
    }
    throw e;
  }
  tr.firstSession = session._id;
  await tr.save();
  try {
    await createAutoWeeklyPlanDraft(req.user.id, tr.player, session.scheduledAt, { ifExists: 'skip' });
  } catch (e) {
    console.warn('[plan][auto-draft-on-start] skipped:', e.message);
  }
  try {
    await notifyUser(tr.player, {
      title: 'Training session scheduled',
      body: `Your first session is set for ${formatMeetingWhen(session.scheduledAt)}${
        session.location ? ` at ${session.location}` : ''
      } (${session.durationMinutes} min).`,
      category: 'training',
    });
  } catch (e) {
    console.warn('[notify][session-started] failed:', e.message);
  }
  const populated = await TrainingSession.findById(session._id).populate(populatePlayerBrief).lean();
  res.status(201).json({ success: true, data: { request: tr, session: populated } });
});

const listTrainingSessions = asyncHandler(async (req, res) => {
  const list = await TrainingSession.find({ coach: req.user.id })
    .populate(populatePlayerBrief)
    .sort({ scheduledAt: 1 })
    .lean();
  const sessionIds = list.map((s) => s._id);
  let attendanceBySession = new Map();
  if (sessionIds.length) {
    const rows = await AttendanceRecord.find({ session: { $in: sessionIds } })
      .select('session present notes updatedAt')
      .lean();
    attendanceBySession = new Map(rows.map((row) => [String(row.session), row]));
  }
  res.json({
    success: true,
    data: list.map((s) => ({
      ...s,
      attendance: attendanceBySession.get(String(s._id)) || null,
    })),
  });
});

const createTrainingSession = asyncHandler(async (req, res) => {
  const { playerId, scheduledAt, location, durationMinutes } = req.body;
  if (!playerId || !scheduledAt) {
    return res.status(400).json({ success: false, message: 'playerId and scheduledAt are required.' });
  }
  const session = await scheduleTrainingSession({
    coachId: req.user.id,
    playerId,
    scheduledAt,
    location,
    durationMinutes,
  });
  try {
    await notifyUser(playerId, {
      title: 'Training session scheduled',
      body: `Your coach scheduled a ${session.durationMinutes}-minute session for ${new Date(session.scheduledAt).toLocaleString()}.`,
      category: 'training',
    });
  } catch (e) {
    console.warn('[notify][session-scheduled] failed:', e.message);
  }
  const populated = await TrainingSession.findById(session._id).populate(populatePlayerBrief).lean();
  res.status(201).json({ success: true, data: populated });
});

const updateTrainingSession = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findOne({ _id: req.params.id, coach: req.user.id });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'scheduled') {
    return res.status(400).json({ success: false, message: 'Only scheduled sessions can be updated.' });
  }

  const patch = {};
  let notifyPlayer = false;
  const prevTime = new Date(session.scheduledAt).getTime();
  const prevLocation = session.location || '';

  if (req.body.scheduledAt !== undefined) {
    const when = new Date(req.body.scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid schedule time.' });
    }
    if (when.getTime() < Date.now() - 60_000) {
      return res.status(400).json({ success: false, message: 'Schedule time must be in the future.' });
    }
    const duration =
      req.body.durationMinutes !== undefined
        ? await resolveCoachSessionDuration(req.user.id, req.body.durationMinutes)
        : session.durationMinutes ?? SESSION_DURATION_MINUTES;
    if (await sessionConflicts(req.user.id, session.player, when, duration, session._id)) {
      return res.status(409).json({ success: false, message: 'This player already has a session overlapping that time.' });
    }
    patch.scheduledAt = when;
  }

  if (req.body.durationMinutes !== undefined) {
    patch.durationMinutes = await resolveCoachSessionDuration(req.user.id, req.body.durationMinutes);
  }

  if (req.body.location !== undefined) {
    patch.location = req.body.location ? String(req.body.location).trim() : undefined;
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ success: false, message: 'No changes provided.' });
  }

  const updated = await TrainingSession.findByIdAndUpdate(session._id, patch, { new: true })
    .populate(populatePlayerBrief)
    .lean();

  const newTime = new Date(updated.scheduledAt).getTime();
  const newLocation = updated.location || '';
  if (newTime !== prevTime || newLocation !== prevLocation) notifyPlayer = true;

  if (notifyPlayer) {
    try {
      await notifyUser(session.player, {
        title: 'Training session updated',
        body: `Your coach updated your session to ${new Date(updated.scheduledAt).toLocaleString()}${
          updated.location ? ` at ${updated.location}` : ''
        }.`,
        category: 'training',
      });
    } catch (e) {
      console.warn('[notify][session-updated] failed:', e.message);
    }
  }

  res.json({ success: true, data: updated });
});

const generateAutoTrainingPlan = asyncHandler(async (req, res) => {
  const { playerId, weekStartDate, publishNow, replaceExisting } = req.body;
  const ref = weekStartDate ? new Date(weekStartDate) : new Date();
  if (Number.isNaN(ref.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid week start date' });
  }
  const publishImmediately = publishNow === true || publishNow === 'true';
  const shouldReplace = replaceExisting !== false && replaceExisting !== 'false';
  const weekStart = mondayOfDate(ref);

  let plan;
  let created = false;
  let replaced = false;
  ({ plan, created, replaced } = await createAutoWeeklyPlanDraft(req.user.id, playerId, ref, {
    ifExists: shouldReplace ? 'replace' : 'error',
  }));

  if (publishImmediately && plan.status === 'draft') {
    plan = await publishPlanToPlayer(plan);
  }

  const data = await TrainingPlan.findById(plan._id).populate(populatePlayerBrief).lean();
  const message =
    plan.status === 'published'
      ? replaced
        ? 'Plan regenerated from latest evaluation and published to the player.'
        : 'Plan is visible to the player on their Schedule page.'
      : replaced
        ? 'Previous draft replaced with a fresh evaluation-based plan. Review and publish below.'
        : created
          ? 'Evaluation-based draft saved. The player cannot see it until you click Publish.'
          : 'Draft already existed for this week. Publish it below so the player can see it.';

  res.status(created ? 201 : 200).json({
    success: true,
    data,
    created,
    replaced,
    published: plan.status === 'published',
    message,
  });
});

const createTrainingPlan = asyncHandler(async (req, res) => {
  const rel = await TrainingSession.findOne({
    coach: req.user.id,
    player: req.body.player,
    status: { $in: ['scheduled', 'completed'] },
  });
  if (!rel) {
    return res.status(400).json({
      success: false,
      message: 'You must have an active training session with this player before publishing a weekly plan.',
    });
  }
  const plan = await TrainingPlan.create({
    ...req.body,
    coach: req.user.id,
    weekStartDate: new Date(req.body.weekStartDate),
    status: req.body.status || 'published',
    isAutoGenerated: false,
    coachReviewed: true,
    generationMethod: 'rules',
    generationMeta: { provider: 'manual', model: 'manual', generatedAt: new Date() },
  });
  await notifyUser(plan.player, {
    title: 'New training plan',
    body: plan.title || 'Weekly plan updated',
    category: 'training',
  });
  res.status(201).json({ success: true, data: plan });
});

const listTrainingPlans = asyncHandler(async (req, res) => {
  const list = await TrainingPlan.find({ coach: req.user.id })
    .populate(populatePlayerBrief)
    .sort({ weekStartDate: -1 })
    .lean();
  res.json({ success: true, data: list });
});

const updateTrainingPlan = asyncHandler(async (req, res) => {
  const prev = await TrainingPlan.findOne({ _id: req.params.id, coach: req.user.id });
  if (!prev) return res.status(404).json({ success: false, message: 'Not found' });
  const body = { ...req.body };
  if (body.status === 'published') body.coachReviewed = true;
  let plan = await TrainingPlan.findOneAndUpdate({ _id: req.params.id, coach: req.user.id }, body, {
    new: true,
  });
  if (prev.status === 'draft' && plan.status === 'published') {
    try {
      const note = planPublishNotification(plan);
      await notifyUser(plan.player, note);
    } catch (e) {
      console.warn('[notify][training-plan-published] failed:', e.message);
    }
  }
  res.json({ success: true, data: plan });
});

const deleteTrainingPlan = asyncHandler(async (req, res) => {
  const plan = await TrainingPlan.findOne({ _id: req.params.id, coach: req.user.id });
  if (!plan) return res.status(404).json({ success: false, message: 'Not found' });
  if (plan.status === 'published') {
    return res.status(400).json({ success: false, message: 'Published plans cannot be deleted. Create a new week plan instead.' });
  }
  await TrainingPlan.deleteOne({ _id: plan._id });
  res.json({ success: true, message: 'Draft deleted.' });
});

const listAttendance = asyncHandler(async (req, res) => {
  const records = await AttendanceRecord.find({ coach: req.user.id })
    .populate({
      path: 'player',
      select: 'email',
      populate: {
        path: 'playerProfile',
        select: 'fullName phone city address sportPreference skillLevel profilePhotoUrl updatedAt',
      },
    })
    .populate('session', 'scheduledAt location status')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: records });
});

const markAttendance = asyncHandler(async (req, res) => {
  const session = await TrainingSession.findOne({ _id: req.params.sessionId, coach: req.user.id });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  const { present, notes } = req.body;
  const rec = await AttendanceRecord.findOneAndUpdate(
    { session: session._id },
    { session: session._id, coach: req.user.id, player: session.player, present, notes },
    { upsert: true, new: true }
  );
  session.status = 'completed';
  await session.save();
  res.json({
    success: true,
    data: {
      attendance: rec,
      session: { _id: session._id, status: session.status },
    },
  });
});

const addPerformance = asyncHandler(async (req, res) => {
  const { playerId, weekStartDate, technique, fitness, attitude, comments, skillScores: rawSkillScores } = req.body;
  const session = await TrainingSession.findOne({ coach: req.user.id, player: playerId });
  if (!session) {
    return res.status(400).json({ success: false, message: 'No training relationship with this player' });
  }

  const playerProfile = await PlayerProfile.findOne({ user: playerId }).select('sportPreference').lean();
  const sport = playerProfile?.sportPreference || 'cricket';

  let skillScores = normalizeSkillScores(rawSkillScores, sport);
  let derived;

  if (skillScores.length) {
    derived = deriveLegacyScores(skillScores, sport);
  } else {
    derived = {
      technique: technique != null ? technique : 0,
      fitness: fitness != null ? fitness : 0,
      attitude: attitude != null ? attitude : 0,
      overallScore: evaluationSummaryScore({
        technique: technique != null ? technique : 0,
        fitness: fitness != null ? fitness : 0,
        attitude: attitude != null ? attitude : 0,
      }),
      categoryAverages: {},
    };
  }

  const ev = await PerformanceEvaluation.create({
    coach: req.user.id,
    player: playerId,
    weekStartDate: new Date(weekStartDate),
    sport,
    skillScores,
    categoryAverages: derived.categoryAverages,
    overallScore: derived.overallScore,
    technique: derived.technique,
    fitness: derived.fitness,
    attitude: derived.attitude,
    comments,
  });

  let evalNotifyBody = 'Your coach posted a weekly evaluation.';
  if (skillScores.length) {
    const gaps = analyzeSkillGaps(skillScores, sport);
    const insights = buildPlayerInsights(gaps);
    if (insights.notificationBody) {
      evalNotifyBody = insights.notificationBody.replace('Open Schedule for your full weekly plan.', 'See Performance for details.');
    }
  }

  await notifyUser(playerId, {
    title: skillScores.length ? 'Skill evaluation feedback' : 'Performance update',
    body: evalNotifyBody,
    category: 'performance',
    actionUrl: '/player/performance',
  });
  res.status(201).json({ success: true, data: ev });
});

const getEvaluationRubricHandler = asyncHandler(async (req, res) => {
  const sport = req.query.sport || req.params.sport || 'cricket';
  const playerCategory = req.query.playerCategory || null;
  res.json({ success: true, data: getEvaluationRubric(sport, playerCategory) });
});

const listEvaluationRubricsHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, data: listEvaluationRubrics() });
});

const getPlayerProgress = asyncHandler(async (req, res) => {
  const playerId = req.params.playerId;
  const rel = await TrainingSession.findOne({ coach: req.user.id, player: playerId });
  if (!rel) return res.status(403).json({ success: false, message: 'Not your player' });
  const perf = await PerformanceEvaluation.find({ player: playerId }).sort({ weekStartDate: -1 }).lean();
  const att = await AttendanceRecord.find({ coach: req.user.id, player: playerId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { performance: perf, attendance: att } });
});

const listCoachGroundBookings = asyncHandler(async (req, res) => {
  const list = await GroundBooking.find({
    bookedBy: req.user.id,
    bookedByRole: 'coach',
    status: { $in: ['held', 'confirmed'] },
  })
    .populate('ground')
    .sort({ startTime: -1 })
    .lean();
  res.json({ success: true, data: list });
});

const holdGroundBooking = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { groundId, startTime, endTime, amount } = req.body;
  const ground = await IndoorGround.findById(groundId);
  if (!ground || !ground.isActive) return res.status(404).json({ success: false, message: 'Ground not found' });

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (end <= start) return res.status(400).json({ success: false, message: 'Invalid time range' });

  const conflict = await hasOverlap(groundId, start, end);
  if (conflict) return res.status(409).json({ success: false, message: 'Slot unavailable' });

  const holdMins = parseInt(process.env.HOLD_MINUTES || '5', 10);
  const holdExpiresAt = new Date(Date.now() + holdMins * 60 * 1000);
  const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  const computedAmount =
    amount != null && Number.isFinite(Number(amount))
      ? Number(amount)
      : Math.round((ground.pricePerHour || 0) * durationHours);

  const booking = await GroundBooking.create({
    ground: groundId,
    bookedBy: req.user.id,
    bookedByRole: 'coach',
    startTime: start,
    endTime: end,
    status: 'held',
    holdExpiresAt,
    amount: computedAmount,
  });
  res.status(201).json({ success: true, data: booking });
});

const initiateGroundEasypaisaPayment = asyncHandler(async (req, res) => {
  const booking = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'coach',
    status: 'held',
  }).populate('ground');
  if (!booking) return res.status(404).json({ success: false, message: 'Hold not found' });
  if (booking.holdExpiresAt < new Date()) {
    booking.status = 'cancelled';
    await booking.save();
    return res.status(410).json({ success: false, message: 'Hold expired' });
  }
  const ground = booking.ground;
  if (!ground?.businessOwner) {
    return res.status(400).json({ success: false, message: 'This ground is not available for online payment.' });
  }
  const payee = await getBusinessOwnerPaymentAccount(ground.businessOwner);
  if (!payee) {
    return res.status(503).json({
      success: false,
      message: 'Ground owner has not linked an Easypaisa account yet. Try another venue.',
    });
  }
  if (!Number.isFinite(Number(booking.amount)) || booking.amount < 0) {
    return res.status(400).json({ success: false, message: 'Invalid booking amount.' });
  }
  if (booking.amount === 0) {
    return res.json({
      success: true,
      data: {
        orderRef: generateOrderRef('GB-FREE'),
        amount: 0,
        currency: 'PKR',
        payeeMobile: payee.mobile,
        payeeTitle: payee.accountTitle,
        mode: 'free',
        instructions: 'No advance payment required for this slot.',
      },
    });
  }

  const orderRef = generateOrderRef('GB');
  const session = buildEasypaisaCheckoutSession({
    orderRef,
    amount: booking.amount,
    currency: 'PKR',
    payeeMobile: payee.mobile,
    payeeTitle: payee.accountTitle,
  });

  const existingPending = await Payment.findOne({
    payer: req.user.id,
    status: 'pending',
    'meta.bookingId': String(booking._id),
  });
  if (existingPending) await Payment.deleteOne({ _id: existingPending._id });

  await Payment.create({
    payer: req.user.id,
    payee: ground.businessOwner,
    type: 'ground_booking',
    amount: booking.amount,
    status: 'pending',
    externalRef: orderRef,
    meta: {
      paymentMethod: 'easypaisa',
      purpose: 'ground_booking',
      orderRef,
      bookingId: String(booking._id),
      payeeMobile: payee.mobile,
      payeeTitle: payee.accountTitle,
      mockPayToken: session.mockPayToken,
      bookedByRole: 'coach',
    },
  });

  res.json({ success: true, data: session });
});

const confirmGroundPayment = asyncHandler(async (req, res) => {
  const { guestName, guestPhone, guestAddress, guestCity, orderRef, easypaisaTxnId, mockPayToken } = req.body;
  const booking = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'coach',
    status: 'held',
  }).populate('ground');
  if (!booking) return res.status(404).json({ success: false, message: 'Hold not found' });
  if (booking.holdExpiresAt < new Date()) {
    booking.status = 'cancelled';
    await booking.save();
    return res.status(410).json({ success: false, message: 'Hold expired' });
  }

  const cp = await CoachProfile.findOne({ user: req.user.id }).lean();
  const name = guestName?.trim() || cp?.fullName || 'Coach';
  const phone = guestPhone?.trim() || cp?.phone || '';
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Add your phone number in profile or provide a contact phone to confirm booking.',
    });
  }
  if (!orderRef && booking.amount > 0) {
    return res.status(400).json({ success: false, message: 'Payment reference is required.' });
  }

  let paymentId;
  let txnLabel = 'N/A';

  if (booking.amount > 0) {
    const pending = await Payment.findOne({
      payer: req.user.id,
      status: 'pending',
      externalRef: orderRef,
      'meta.bookingId': String(booking._id),
      type: 'ground_booking',
    });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Payment session not found. Start checkout again.' });
    }

    const verified = await verifyEasypaisaPayment({
      orderRef,
      txnId: easypaisaTxnId,
      mockPayToken,
      expectedAmount: booking.amount,
      pendingMeta: pending.meta,
    });

    pending.status = 'completed';
    pending.externalRef = verified.txnId;
    pending.meta = {
      ...pending.meta,
      easypaisaTxnId: verified.txnId,
      verifiedAt: new Date().toISOString(),
      mode: verified.mode,
    };
    await pending.save();
    paymentId = pending._id;
    txnLabel = verified.txnId;
  }

  const paymentNote =
    booking.amount > 0
      ? `Easypaisa payment received — PKR ${booking.amount}. Txn: ${txnLabel}.`
      : 'Booking confirmed — no advance payment required.';

  let confirmedBooking;
  try {
    confirmedBooking = await finalizeGroundBookingConfirm({
      booking,
      paymentId,
      txnLabel,
      guestName: name,
      guestPhone: phone,
      guestAddress: guestAddress ? String(guestAddress).trim() : cp?.academyLocation || undefined,
      guestCity: guestCity ? String(guestCity).trim() : cp?.city || undefined,
      paymentNote,
    });
  } catch (e) {
    if (e.statusCode === 409) {
      booking.status = 'cancelled';
      await booking.save();
    }
    return res.status(e.statusCode || 500).json({ success: false, message: e.message });
  }

  const ground = booking.ground;
  if (ground?.businessOwner) {
    try {
      await notifyUser(ground.businessOwner, {
        title: 'Ground booking confirmed',
        body: `${name} booked ${ground.name} (${new Date(confirmedBooking.startTime).toLocaleString()}). Ref: ${confirmedBooking.confirmationToken}`,
        category: 'booking',
        actionUrl: '/business/ground-bookings',
      });
    } catch (e) {
      console.warn('[notify][coach-ground-booking] failed:', e.message);
    }
  }

  res.json({ success: true, data: confirmedBooking });
});

const cancelGroundBooking = asyncHandler(async (req, res) => {
  const booking = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'coach',
  });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (booking.status === 'cancelled') return res.json({ success: true, data: booking });
  booking.status = 'cancelled';
  await booking.save();
  res.json({ success: true, data: booking });
});

const listFeedback = asyncHandler(async (req, res) => {
  const list = await CoachFeedback.find({ coach: req.user.id })
    .sort({ createdAt: -1 })
    .populate('player', 'email')
    .lean();
  list.forEach((f) => {
    if (f.anonymous) {
      delete f.player;
      f.playerDisplay = 'Anonymous player';
    }
  });
  res.json({ success: true, data: list });
});

const replyFeedback = asyncHandler(async (req, res) => {
  const fb = await CoachFeedback.findOneAndUpdate(
    { _id: req.params.id, coach: req.user.id },
    { coachReply: req.body.reply },
    { new: true }
  );
  if (!fb) return res.status(404).json({ success: false, message: 'Not found' });
  await notifyUser(fb.player, { title: 'Coach replied to your feedback', body: req.body.reply, category: 'feedback' });
  res.json({ success: true, data: fb });
});

async function coachAvailableBalance(coachId) {
  const income = await Payment.find({ payee: coachId, type: 'coach_fee', status: 'completed' }).lean();
  const gross = income.reduce((s, p) => s + p.amount, 0);
  const withdrawals = await Payment.find({
    payer: coachId,
    type: 'withdrawal',
    status: { $in: ['pending', 'completed'] },
  }).lean();
  const withdrawn = withdrawals.reduce((s, p) => s + p.amount, 0);
  return { gross, withdrawn, available: gross - withdrawn };
}

const listPayments = asyncHandler(async (req, res) => {
  const coachId = req.user.id;
  const received = await Payment.find({ payee: coachId, type: 'coach_fee', status: 'completed' })
    .sort({ createdAt: -1 })
    .lean();
  const withdrawals = await Payment.find({ payer: coachId, type: 'withdrawal' }).sort({ createdAt: -1 }).lean();
  const { gross, available } = await coachAvailableBalance(coachId);
  const transactions = [...received, ...withdrawals].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({
    success: true,
    data: {
      transactions,
      totalReceived: gross,
      availableBalance: available,
    },
  });
});

/** Prototype bank withdrawal (records payout; integrate real gateway later) */
const requestWithdrawal = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  const { available } = await coachAvailableBalance(req.user.id);
  if (amount > available) {
    return res.status(400).json({ success: false, message: 'Amount exceeds available balance' });
  }
  const payment = await Payment.create({
    payer: req.user.id,
    type: 'withdrawal',
    amount,
    status: 'completed',
    externalRef: 'mock-bank-withdrawal',
    meta: { note: 'Prototype settlement — replace with payout integration' },
  });
  await notifyUser(req.user.id, {
    title: 'Withdrawal processed',
    body: `Your withdrawal of ${amount} was recorded (prototype).`,
    category: 'payment',
  });
  res.status(201).json({ success: true, data: payment });
});

const listStudentFees = asyncHandler(async (req, res) => {
  const list = await StudentFeeRecord.find({ coach: req.user.id })
    .populate({
      path: 'player',
      select: 'email',
      populate: { path: 'playerProfile', select: 'fullName profilePhotoUrl' },
    })
    .sort({ joiningDate: -1 })
    .lean();
  res.json({ success: true, data: list });
});

const upsertStudentFee = asyncHandler(async (req, res) => {
  const { playerId, joiningDate, monthlyFee, notes, status, studentName } = req.body;
  if (!playerId) return res.status(400).json({ success: false, message: 'playerId is required.' });
  await assertActiveStudent(req.user.id, playerId);

  const player = await User.findById(playerId).populate('playerProfile').lean();
  const name =
    (studentName && String(studentName).trim()) ||
    player?.playerProfile?.fullName ||
    player?.email ||
    'Student';
  const fee = Number(monthlyFee);
  if (!Number.isFinite(fee) || fee < 0) {
    return res.status(400).json({ success: false, message: 'Valid monthly fee is required.' });
  }
  const join = joiningDate ? new Date(joiningDate) : new Date();
  if (Number.isNaN(join.getTime())) {
    return res.status(400).json({ success: false, message: 'Valid joining date is required.' });
  }

  const record = await StudentFeeRecord.findOneAndUpdate(
    { coach: req.user.id, player: playerId },
    {
      coach: req.user.id,
      player: playerId,
      studentName: name,
      joiningDate: join,
      monthlyFee: fee,
      notes: notes ? String(notes).trim() : undefined,
      status: status === 'inactive' ? 'inactive' : 'active',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: record });
});

const deleteStudentFee = asyncHandler(async (req, res) => {
  const deleted = await StudentFeeRecord.findOneAndDelete({ _id: req.params.id, coach: req.user.id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Fee record not found' });
  res.json({ success: true, message: 'Deleted' });
});

const listNotifications = asyncHandler(async (req, res) => {
  const list = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: list });
});

const uploadDocumentMeta = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  const doc = await VerificationDocument.create({
    user: req.user.id,
    roleContext: 'coach',
    filePath: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    docType: req.body.docType,
    issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
    expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
    status: 'pending',
  });
  const user = await User.findById(req.user.id);
  user.verificationStatus = 'pending_review';
  await user.save();
  res.status(201).json({ success: true, data: doc });
});

const listDocuments = asyncHandler(async (req, res) => {
  const list = await VerificationDocument.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: list });
});

const streamOwnDocumentFile = asyncHandler(async (req, res) => {
  const doc = await VerificationDocument.findOne({
    _id: req.params.docId,
    user: req.user.id,
    roleContext: 'coach',
  }).lean();
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  streamVerificationDocumentFile(doc, res);
});

function averagePerformanceScore(row) {
  return evaluationSummaryScore(row);
}

const getDashboard = asyncHandler(async (req, res) => {
  const coachId = req.user.id;
  const now = new Date();
  const startOfRange = new Date(now);
  startOfRange.setHours(0, 0, 0, 0);
  startOfRange.setDate(startOfRange.getDate() - 6);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    pendingRequests,
    balance,
    sessionsLast7,
    pastSessions,
    attendanceRecords,
    performances,
    acceptedRequests,
    upcomingByPlayer,
    feeLedgerRows,
  ] = await Promise.all([
    TrainingRequest.countDocuments({ coach: coachId, status: 'pending' }),
    coachAvailableBalance(coachId),
    TrainingSession.find({
      coach: coachId,
      scheduledAt: { $gte: startOfRange, $lte: endOfToday },
      status: { $ne: 'cancelled' },
    }).lean(),
    TrainingSession.find({
      coach: coachId,
      scheduledAt: { $gte: thirtyDaysAgo, $lte: now },
      status: { $in: ['scheduled', 'completed'] },
    }).lean(),
    AttendanceRecord.find({ coach: coachId }).select('session present').lean(),
    PerformanceEvaluation.find({ coach: coachId }).sort({ weekStartDate: -1 }).lean(),
    TrainingRequest.find({
      coach: coachId,
      status: 'accepted',
      feesClearedAt: { $ne: null },
    })
      .populate(populatePlayerBrief)
      .sort({ updatedAt: -1 })
      .lean(),
    TrainingSession.find({
      coach: coachId,
      status: 'scheduled',
      scheduledAt: { $gte: now },
    })
      .select('player scheduledAt')
      .sort({ scheduledAt: 1 })
      .lean(),
    StudentFeeRecord.find({ coach: coachId, status: 'active' }).select('monthlyFee').lean(),
  ]);

  const feesLedgerTotal = feeLedgerRows.reduce((s, r) => s + (Number(r.monthlyFee) || 0), 0);
  const paymentsReceived = balance.gross;
  const totalReceived = paymentsReceived + feesLedgerTotal;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyChart = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = sessionsLast7.filter((s) => {
      const t = new Date(s.scheduledAt);
      return t >= dayStart && t < dayEnd;
    }).length;
    weeklyChart.push({ label: dayLabels[dayStart.getDay()], count });
  }
  const maxChart = Math.max(1, ...weeklyChart.map((d) => d.count));
  const weeklyChartWithHeight = weeklyChart.map((d) => ({
    ...d,
    heightPercent: Math.round((d.count / maxChart) * 100),
  }));

  const attendanceBySession = new Set(attendanceRecords.map((a) => String(a.session)));
  const sessionsDue = pastSessions.filter((s) => new Date(s.scheduledAt) <= now);
  const sessionsMarked = sessionsDue.filter((s) => attendanceBySession.has(String(s._id))).length;
  const sessionReadiness =
    sessionsDue.length > 0 ? Math.round((sessionsMarked / sessionsDue.length) * 100) : null;

  const latestByPlayer = new Map();
  for (const row of performances) {
    const pid = String(row.player);
    if (latestByPlayer.has(pid)) continue;
    const score = averagePerformanceScore(row);
    if (score == null) continue;
    latestByPlayer.set(pid, { playerId: pid, score: Math.round(score) });
  }
  const ranked = [...latestByPlayer.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  const profiles = ranked.length
    ? await PlayerProfile.find({ user: { $in: ranked.map((p) => p.playerId) } })
        .select('user fullName')
        .lean()
    : [];
  const nameByUser = Object.fromEntries(profiles.map((p) => [String(p.user), p.fullName]));

  const nextSessionByPlayer = new Map();
  for (const s of upcomingByPlayer) {
    const pid = String(s.player);
    if (!nextSessionByPlayer.has(pid)) nextSessionByPlayer.set(pid, s.scheduledAt);
  }

  const studentsById = new Map();
  for (const tr of acceptedRequests) {
    const playerDoc = tr.player;
    const pid = String(playerDoc?._id || playerDoc);
    if (!pid) continue;
    const pp = playerDoc?.playerProfile;
    studentsById.set(pid, {
      playerId: pid,
      fullName: pp?.fullName || playerDoc?.email || 'Player',
      email: playerDoc?.email,
      city: pp?.city || '',
      sportPreference: pp?.sportPreference || '',
      skillLevel: pp?.skillLevel || '',
      playerCategory: pp?.playerCategory || '',
      profilePhotoUrl: pp?.profilePhotoUrl || '',
      profileUpdatedAt: pp?.updatedAt,
      coachRollNo: tr.coachRollNo || '',
      acceptedAt: tr.updatedAt || tr.createdAt,
      nextSessionAt: nextSessionByPlayer.get(pid) || null,
    });
  }

  const myStudents = [...studentsById.values()];

  res.json({
    success: true,
    data: {
      pendingRequests,
      activeStudents: myStudents.length,
      myStudents,
      currency: 'PKR',
      paymentsReceived,
      feesLedgerTotal,
      totalReceived,
      availableBalance: balance.available,
      sessionReadiness,
      weeklyVolume: sessionsLast7.length,
      weeklyChart: weeklyChartWithHeight,
      topPerformers: ranked.map((p) => ({
        playerId: p.playerId,
        name: nameByUser[p.playerId] || 'Player',
        score: p.score,
        scoreLabel: `${p.score}% avg`,
      })),
    },
  });
});

module.exports = {
  getProfile,
  getDashboard,
  getCoachSubscriptionStatus,
  createCoachSubscriptionPaymentIntent,
  subscribeCoachPlatform,
  renewCoachPlatform,
  updateProfile,
  updateAvailability,
  listTrainingRequests,
  updateTrainingRequest,
  markTrainingFeesCleared,
  startTrainingFromRequest,
  listTrainingSessions,
  createTrainingSession,
  updateTrainingSession,
  generateAutoTrainingPlan,
  createTrainingPlan,
  listTrainingPlans,
  updateTrainingPlan,
  deleteTrainingPlan,
  listAttendance,
  markAttendance,
  addPerformance,
  getEvaluationRubricHandler,
  listEvaluationRubricsHandler,
  getPlayerProgress,
  listCoachGroundBookings,
  holdGroundBooking,
  initiateGroundEasypaisaPayment,
  confirmGroundPayment,
  cancelGroundBooking,
  listFeedback,
  replyFeedback,
  listPayments,
  listStudentFees,
  upsertStudentFee,
  deleteStudentFee,
  requestWithdrawal,
  listNotifications,
  uploadDocumentMeta,
  uploadProfilePhoto,
  removeProfilePhoto,
  uploadAcademyPhoto,
  removeAcademyPhoto,
  listDocuments,
  streamOwnDocumentFile,
};

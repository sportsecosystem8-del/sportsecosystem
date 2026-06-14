const { validationResult } = require('express-validator');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const CoachProfile = require('../models/CoachProfile');
const TrainingRequest = require('../models/TrainingRequest');
const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');
const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const IndoorGround = require('../models/IndoorGround');
const GroundBooking = require('../models/GroundBooking');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const CoachFeedback = require('../models/CoachFeedback');
const VerificationDocument = require('../models/VerificationDocument');
const Complaint = require('../models/Complaint');
const { asyncHandler } = require('../utils/asyncHandler');
const { hasOverlap } = require('../utils/groundBookings');
const { notifyUser } = require('../utils/notify');
const { verifiedBusinessOwnerIds } = require('../utils/verifiedSellers');
const { effectiveProductPrice, inSaleWindow } = require('../utils/pricing');
const { buildProductOrderContext } = require('../utils/productOrder');
const {
  GROUND_BOOKING_CURRENCY,
  GROUND_BOOKING_MIN_PKR,
  groundBookingAmountToMinor,
  isValidGroundBookingStripeAmount,
} = require('../utils/groundBookingCurrency');
const { enrichOrderItemsWithImages } = require('../utils/productImages');
const { streamVerificationDocumentFile } = require('../utils/streamVerificationDocument');
const {
  getStripe,
  isStripeEnabled,
  dollarsToCents,
  retrieveSucceededPaymentIntent,
  assertAmountMatches,
  paymentIntentMethodSpec,
} = require('../utils/stripePayments');
const { generateCoachRecommendations } = require('../services/aiCoachEngine');

const populateCoachBrief = {
  path: 'coach',
  select: 'email verificationStatus',
  populate: {
    path: 'coachProfile',
    select: 'fullName city specialties profilePhotoUrl averageRating academyLocation locationMapUrl',
  },
};
const populatePlayerBrief = {
  path: 'player',
  select: 'email',
  populate: { path: 'playerProfile', select: 'fullName city sportPreference skillLevel' },
};

const RECOMMENDATION_WEIGHTS = Object.freeze({
  skill: 0.35,
  time: 0.25,
  location: 0.2,
  performance: 0.2,
});

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function parseOptionalLimit(rawLimit) {
  if (rawLimit == null || rawLimit === '') return 5;
  const n = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(n)) return 5;
  return Math.max(3, Math.min(5, n));
}

function toMinutesOfDay(timeText) {
  if (!timeText || typeof timeText !== 'string' || !timeText.includes(':')) return null;
  const [h, m] = timeText.split(':').map((n) => Number.parseInt(n, 10));
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function derivePlayerTimePreferences(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const buckets = new Map();
  sessions.forEach((s) => {
    const at = s?.scheduledAt ? new Date(s.scheduledAt) : null;
    if (!at || Number.isNaN(at.getTime())) return;
    const day = at.getDay();
    const slotStart = at.getHours() * 60 + at.getMinutes();
    const key = `${day}-${slotStart}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => {
      const [dayStr, startStr] = key.split('-');
      const start = Number.parseInt(startStr, 10);
      return { dayOfWeek: Number.parseInt(dayStr, 10), start, end: start + 60 };
    });
}

function scoreTimeOverlap(playerSlots, coachAvailability) {
  if (!Array.isArray(coachAvailability) || coachAvailability.length === 0) {
    return { score: 0.4, detail: 'Coach availability not set yet.' };
  }
  if (!Array.isArray(playerSlots) || playerSlots.length === 0) {
    return { score: 0.5, detail: 'Using neutral time score (not enough player slot history).' };
  }

  let overlaps = 0;
  playerSlots.forEach((slot) => {
    const found = coachAvailability.some((a) => {
      if (a?.dayOfWeek !== slot.dayOfWeek) return false;
      const start = toMinutesOfDay(a.start);
      const end = toMinutesOfDay(a.end);
      if (start == null || end == null) return false;
      return start < slot.end && end > slot.start;
    });
    if (found) overlaps += 1;
  });
  const ratio = playerSlots.length ? overlaps / playerSlots.length : 0;
  return { score: clamp01(ratio), detail: overlaps ? `${overlaps} preferred slot(s) overlap.` : 'No strong slot overlap yet.' };
}

function scoreLocation(playerCity, coachProfile) {
  const coachCity = coachProfile?.city;
  const academy = String(coachProfile?.academyLocation || '').trim();
  const p = String(playerCity || '').trim().toLowerCase();
  const c = String(coachCity || '').trim().toLowerCase();
  if (!p || !c) {
    return {
      score: 0.45,
      detail: academy ? `Academy: ${academy}.` : 'Location partially available.',
    };
  }
  if (p === c) {
    return {
      score: 1,
      detail: academy ? `Same city — ${academy}.` : `Same city — ${coachCity}.`,
    };
  }
  if (p.includes(c) || c.includes(p)) {
    return {
      score: 0.75,
      detail: academy ? `Near city — ${academy}.` : 'Near city match.',
    };
  }
  return {
    score: 0.25,
    detail: academy ? `Different city — academy in ${coachCity}: ${academy}.` : `Different city — ${coachCity}.`,
  };
}

function levelToIndex(level) {
  const map = { beginner: 0, intermediate: 1, advanced: 2 };
  return map[level] ?? 0;
}

function derivePlayerPerformanceSignal(evals, fallbackLevel) {
  if (!Array.isArray(evals) || evals.length === 0) {
    return {
      normalized: (levelToIndex(fallbackLevel) + 1) / 3,
      level: fallbackLevel || 'beginner',
      trend: 0,
      source: 'profile',
    };
  }
  const latest = evals[0];
  const latestAvg = ((latest.technique || 0) + (latest.fitness || 0) + (latest.attitude || 0)) / 3;
  const prev = evals[1];
  const prevAvg = prev ? ((prev.technique || 0) + (prev.fitness || 0) + (prev.attitude || 0)) / 3 : latestAvg;
  const trend = clamp01((latestAvg - prevAvg + 100) / 200) * 2 - 1;
  const normalized = clamp01(latestAvg / 100);
  const level = normalized > 0.73 ? 'advanced' : normalized > 0.45 ? 'intermediate' : 'beginner';
  return { normalized, level, trend, source: 'weekly_evaluations' };
}

function scoreSkill(profile, sportPreference, playerLevel) {
  const specialties = Array.isArray(profile?.specialties) ? profile.specialties : [];
  const sportMatch = specialties.includes(sportPreference) ? 1 : 0;
  const rating = clamp01((profile?.averageRating || 0) / 5);
  const confidence = clamp01((profile?.ratingCount || 0) / 20);
  const years = clamp01((profile?.yearsExperience || 0) / 12);
  const coachLevel = years > 0.66 ? 2 : years > 0.33 ? 1 : 0;
  const levelGap = Math.abs(coachLevel - levelToIndex(playerLevel));
  const levelFit = 1 - clamp01(levelGap / 2);
  const score = clamp01(0.35 * sportMatch + 0.25 * rating + 0.15 * confidence + 0.1 * years + 0.15 * levelFit);
  return { score, detail: sportMatch ? 'Sport specialty aligned.' : 'Partial specialty alignment.' };
}

function scorePerformanceFit(playerSignal, profile) {
  const years = clamp01((profile?.yearsExperience || 0) / 12);
  const rating = clamp01((profile?.averageRating || 0) / 5);
  const coachPotential = clamp01(0.55 * years + 0.45 * rating);
  const distance = Math.abs(playerSignal.normalized - coachPotential);
  const closeness = 1 - clamp01(distance);
  const trendBoost = playerSignal.trend > 0.25 ? 0.08 : playerSignal.trend < -0.25 ? -0.08 : 0;
  return {
    score: clamp01(closeness + trendBoost),
    detail:
      playerSignal.source === 'weekly_evaluations'
        ? 'Fit adjusted with recent weekly performance trend.'
        : 'Fit based on current player skill level.',
  };
}

function buildMatchReasons(breakdown, details) {
  return [
    `Skill fit: ${breakdown.skill}% (${details.skill})`,
    `Schedule fit: ${breakdown.time}% (${details.time})`,
    `Location fit: ${breakdown.location}% (${details.location})`,
    `Performance fit: ${breakdown.performance}% (${details.performance})`,
  ];
}

function aiRecommendationsEnabled() {
  return String(process.env.AI_RECOMMENDATIONS_ENABLED || 'true') !== 'false';
}

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('playerProfile');
  if (!user.playerProfile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: user.playerProfile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const profile = await PlayerProfile.findOneAndUpdate({ user: req.user.id }, req.body, { new: true });
  res.json({ success: true, data: profile });
});

/** Automated coach recommendation (sport, skill, location); verified coaches only */
const getRecommendations = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const start = Date.now();
  const limit = parseOptionalLimit(req.query.limit);
  const user = await User.findById(req.user.id).populate('playerProfile');
  const p = user.playerProfile;
  if (!p) return res.status(400).json({ success: false, message: 'Complete player profile first' });

  const coaches = await User.find({
    role: 'coach',
    verificationStatus: 'verified',
    isSuspended: false,
  })
    .populate('coachProfile')
    .lean();

  const [recentEvals, recentSessions] = await Promise.all([
    PerformanceEvaluation.find({ player: req.user.id }).sort({ weekStartDate: -1 }).limit(4).lean(),
    TrainingSession.find({ player: req.user.id }).sort({ scheduledAt: -1 }).limit(20).lean(),
  ]);

  const playerTimeSlots = derivePlayerTimePreferences(recentSessions);
  const playerSignal = derivePlayerPerformanceSignal(recentEvals, p.skillLevel);

  const scored = coaches
    .filter((c) => c.coachProfile && (c.coachProfile.specialties || []).includes(p.sportPreference))
    .map((c) => {
      const skill = scoreSkill(c.coachProfile, p.sportPreference, playerSignal.level);
      const time = scoreTimeOverlap(playerTimeSlots, c.coachProfile.availability);
      const location = scoreLocation(p.city, c.coachProfile);
      const performance = scorePerformanceFit(playerSignal, c.coachProfile);

      const finalScore =
        100 *
        (RECOMMENDATION_WEIGHTS.skill * skill.score +
          RECOMMENDATION_WEIGHTS.time * time.score +
          RECOMMENDATION_WEIGHTS.location * location.score +
          RECOMMENDATION_WEIGHTS.performance * performance.score);

      const breakdown = {
        skill: Math.round(skill.score * 100),
        time: Math.round(time.score * 100),
        location: Math.round(location.score * 100),
        performance: Math.round(performance.score * 100),
      };
      const factorDetails = {
        skill: skill.detail,
        time: time.detail,
        location: location.detail,
        performance: performance.detail,
      };

      return {
        coachUser: c,
        profile: c.coachProfile,
        matchScore: Math.round(finalScore * 10) / 10,
        breakdown,
        reasons: buildMatchReasons(breakdown, factorDetails),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Math.max(limit, 8));

  let generationMethod = 'rules';
  let generationMeta = null;
  let finalRows = scored.slice(0, limit).map((s) => ({
    userId: s.coachUser._id,
    profile: s.profile,
    matchScore: s.matchScore,
    breakdown: s.breakdown,
    reasons: s.reasons,
  }));

  if (aiRecommendationsEnabled() && scored.length) {
    try {
      const aiInput = {
        limit,
        player: {
          sportPreference: p.sportPreference,
          skillLevel: p.skillLevel,
          city: p.city || '',
          performanceLevel: playerSignal.level,
          performanceTrend: playerSignal.trend,
        },
        candidates: scored.map((s) => ({
          userId: String(s.coachUser._id),
          fullName: s.profile?.fullName || '',
          city: s.profile?.city || '',
          specialties: s.profile?.specialties || [],
          yearsExperience: s.profile?.yearsExperience || 0,
          averageRating: s.profile?.averageRating || 0,
          ratingCount: s.profile?.ratingCount || 0,
          availability: s.profile?.availability || [],
          baselineScore: s.matchScore,
        })),
      };
      const ai = await generateCoachRecommendations(aiInput);
      const byId = new Map(scored.map((s) => [String(s.coachUser._id), s]));
      const aiRows = ai.rankedCoaches
        .map((row) => {
          const base = byId.get(String(row.userId));
          if (!base) return null;
          return {
            userId: base.coachUser._id,
            profile: base.profile,
            matchScore: base.matchScore,
            breakdown: base.breakdown,
            reasons: base.reasons,
          };
        })
        .filter(Boolean);
      if (aiRows.length) {
        generationMethod = 'ai';
        generationMeta = { provider: ai.provider, model: ai.model, latencyMs: ai.latencyMs };
        finalRows = aiRows.slice(0, limit);
      }
    } catch (e) {
      generationMeta = { fallbackReason: e.message };
      console.warn('[ai][recommendations] fallback to rules:', e.message);
    }
  }

  const coachIds = finalRows.map((r) => r.userId);
  let certsByCoach = {};
  if (coachIds.length) {
    const approved = await VerificationDocument.find({
      user: { $in: coachIds },
      roleContext: 'coach',
      status: 'approved',
    })
      .select('_id user originalName docType')
      .lean();
    certsByCoach = approved.reduce((acc, d) => {
      const k = String(d.user);
      if (!acc[k]) acc[k] = [];
      acc[k].push({ _id: d._id, originalName: d.originalName, docType: d.docType });
      return acc;
    }, {});
  }

  const elapsed = Date.now() - start;
  res.set('X-Recommendation-ms', String(elapsed));
  res.json({
    success: true,
    generationMethod,
    generationMeta,
    data: finalRows.map((s, idx) => ({
      rank: idx + 1,
      userId: s.userId,
      profile: s.profile,
      matchScore: s.matchScore,
      breakdown: s.breakdown,
      reasons: s.reasons,
      certificates: certsByCoach[String(s.userId)] || [],
    })),
  });
});

async function findVerifiedCoachForPlayer(coachId) {
  return User.findOne({
    _id: coachId,
    role: 'coach',
    verificationStatus: 'verified',
    isSuspended: false,
  }).lean();
}

const listCoachCertificates = asyncHandler(async (req, res) => {
  const coach = await findVerifiedCoachForPlayer(req.params.coachId);
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });

  const list = await VerificationDocument.find({
    user: coach._id,
    roleContext: 'coach',
    status: 'approved',
  })
    .select('_id originalName docType issueDate expiryDate createdAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: list });
});

const streamCoachCertificateFile = asyncHandler(async (req, res) => {
  const coach = await findVerifiedCoachForPlayer(req.params.coachId);
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });

  const doc = await VerificationDocument.findOne({
    _id: req.params.docId,
    user: coach._id,
    roleContext: 'coach',
    status: 'approved',
  }).lean();
  if (!doc) return res.status(404).json({ success: false, message: 'Certificate not found' });

  streamVerificationDocumentFile(doc, res);
});

const createTrainingRequest = asyncHandler(async (req, res) => {
  const { coachId, message, preferredStart } = req.body;
  const coach = await User.findOne({ _id: coachId, role: 'coach', verificationStatus: 'verified' });
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not available' });
  const existing = await TrainingRequest.findOne({
    player: req.user.id,
    coach: coachId,
    status: { $in: ['pending', 'accepted'] },
  });
  if (existing) {
    const message =
      existing.status === 'accepted'
        ? 'You are already training with this coach.'
        : 'You already have a pending request for this coach.';
    return res.status(409).json({ success: false, message });
  }
  const tr = await TrainingRequest.create({
    player: req.user.id,
    coach: coachId,
    message,
    preferredStart: preferredStart ? new Date(preferredStart) : undefined,
  });
  await notifyUser(coachId, {
    title: 'New training request',
    body: 'A player requested a training session.',
    category: 'training',
  });
  res.status(201).json({ success: true, data: tr });
});

const listMyTrainingRequests = asyncHandler(async (req, res) => {
  const list = await TrainingRequest.find({ player: req.user.id })
    .populate(populateCoachBrief)
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: list });
});

const listTrainingSessions = asyncHandler(async (req, res) => {
  const list = await TrainingSession.find({ player: req.user.id })
    .populate(populateCoachBrief)
    .sort({ scheduledAt: 1 })
    .lean();
  res.json({ success: true, data: list });
});

const listTrainingPlans = asyncHandler(async (req, res) => {
  /** Players only see published weekly plans */
  const list = await TrainingPlan.find({ player: req.user.id, status: 'published' })
    .sort({ weekStartDate: -1 })
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

  const booking = await GroundBooking.create({
    ground: groundId,
    bookedBy: req.user.id,
    bookedByRole: 'player',
    startTime: start,
    endTime: end,
    status: 'held',
    holdExpiresAt,
    amount: amount ?? 0,
  });
  res.status(201).json({ success: true, data: booking });
});

const createGroundBookingPaymentIntent = asyncHandler(async (req, res) => {
  if (!isStripeEnabled()) {
    return res.status(503).json({ success: false, message: 'Stripe is not configured on the server.' });
  }
  const booking = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'player',
    status: 'held',
  });
  if (!booking) return res.status(404).json({ success: false, message: 'Hold not found' });
  if (booking.holdExpiresAt < new Date()) {
    booking.status = 'cancelled';
    await booking.save();
    return res.status(410).json({ success: false, message: 'Hold expired' });
  }
  const amountMinor = groundBookingAmountToMinor(booking.amount);
  if (!isValidGroundBookingStripeAmount(booking.amount)) {
    return res.status(400).json({
      success: false,
      message: `Set booking amount to at least ${GROUND_BOOKING_MIN_PKR} PKR for card payment.`,
    });
  }
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: amountMinor,
    currency: GROUND_BOOKING_CURRENCY,
    ...paymentIntentMethodSpec(),
    metadata: {
      purpose: 'ground_booking',
      bookedById: String(req.user.id),
      bookedByRole: 'player',
      bookingId: String(booking._id),
      amountMinor: String(amountMinor),
    },
  });
  res.json({
    success: true,
    data: { clientSecret: pi.client_secret, amount: booking.amount, currency: GROUND_BOOKING_CURRENCY },
  });
});

const confirmGroundPayment = asyncHandler(async (req, res) => {
  const booking = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'player',
    status: 'held',
  });
  if (!booking) return res.status(404).json({ success: false, message: 'Hold not found' });
  if (booking.holdExpiresAt < new Date()) {
    booking.status = 'cancelled';
    await booking.save();
    return res.status(410).json({ success: false, message: 'Hold expired' });
  }
  const conflict = await hasOverlap(booking.ground, booking.startTime, booking.endTime, booking._id);
  if (conflict) {
    booking.status = 'cancelled';
    await booking.save();
    return res.status(409).json({ success: false, message: 'Slot no longer available' });
  }

  let externalRef = 'mock-gateway';
  if (isStripeEnabled()) {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required after card payment.' });
    }
    const pi = await retrieveSucceededPaymentIntent(paymentIntentId);
    if (
      pi.metadata.purpose !== 'ground_booking' ||
      pi.metadata.bookedById !== String(req.user.id) ||
      pi.metadata.bookedByRole !== 'player' ||
      pi.metadata.bookingId !== String(booking._id)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid payment for this booking.' });
    }
    assertAmountMatches(pi, groundBookingAmountToMinor(booking.amount));
    externalRef = paymentIntentId;
  }

  const payment = await Payment.create({
    payer: req.user.id,
    type: 'ground_booking',
    amount: booking.amount,
    status: 'completed',
    externalRef,
  });
  booking.payment = payment._id;
  booking.status = 'confirmed';
  booking.holdExpiresAt = undefined;
  await booking.save();
  res.json({ success: true, data: booking });
});

const listMyGroundBookings = asyncHandler(async (req, res) => {
  const list = await GroundBooking.find({ bookedBy: req.user.id, bookedByRole: 'player' })
    .populate('ground')
    .sort({ startTime: -1 })
    .lean();
  res.json({ success: true, data: list });
});

const cancelGroundBooking = asyncHandler(async (req, res) => {
  const b = await GroundBooking.findOne({ _id: req.params.id, bookedBy: req.user.id, bookedByRole: 'player' });
  if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (b.status === 'cancelled') return res.json({ success: true, data: b });
  b.status = 'cancelled';
  await b.save();
  res.json({ success: true, data: b });
});

const getPerformance = asyncHandler(async (req, res) => {
  const evals = await PerformanceEvaluation.find({ player: req.user.id }).sort({ weekStartDate: -1 }).lean();
  res.json({ success: true, data: evals });
});

const browseProducts = asyncHandler(async (req, res) => {
  const ownerIds = await verifiedBusinessOwnerIds();
  const filter = {
    isActive: true,
    businessOwner: { $in: ownerIds },
  };
  if (req.query.sport) filter.sportType = req.query.sport;
  if (req.query.q) filter.name = new RegExp(String(req.query.q).trim(), 'i');
  if (req.query.category) filter.category = new RegExp(String(req.query.category).trim(), 'i');
  const list = await Product.find(filter).sort({ createdAt: -1 }).lean();
  const data = list.map((p) => ({
    ...p,
    effectivePrice: effectiveProductPrice(p),
    onSale: inSaleWindow(p) && (p.salePrice != null || (p.discountPercent != null && p.discountPercent > 0)),
  }));
  res.json({ success: true, data });
});

const createOrderPaymentIntent = asyncHandler(async (req, res) => {
  if (!isStripeEnabled()) {
    return res.status(503).json({ success: false, message: 'Stripe is not configured on the server.' });
  }
  const { items } = req.body;
  let ctx;
  try {
    ctx = await buildProductOrderContext(items);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ success: false, message: e.message });
  }
  const totalCents = dollarsToCents(ctx.total);
  if (totalCents < 50) {
    return res.status(400).json({
      success: false,
      message: 'Order total is below the minimum card charge (0.50 USD).',
    });
  }
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: 'usd',
    ...paymentIntentMethodSpec(),
    metadata: {
      purpose: 'product_order',
      playerId: String(req.user.id),
      itemHash: ctx.itemHash,
      payee: String(ctx.ownerId),
      totalCents: String(totalCents),
    },
  });
  res.json({
    success: true,
    data: { clientSecret: pi.client_secret, amount: ctx.total, currency: 'usd' },
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, customerNote, cardLast4, paymentIntentId } = req.body;
  let ctx;
  try {
    ctx = await buildProductOrderContext(items);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ success: false, message: e.message });
  }

  let externalRef = 'mock-gateway';
  let meta = {
    cardLast4: cardLast4 || 'mock',
    invoiceRef: `INV-${Date.now()}`,
  };

  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId is required. Complete Stripe payment first.',
      });
    }
    const pi = await retrieveSucceededPaymentIntent(paymentIntentId);
    if (pi.metadata.purpose !== 'product_order' || pi.metadata.playerId !== String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment for this order.' });
    }
    if (pi.metadata.itemHash !== ctx.itemHash) {
      return res.status(400).json({ success: false, message: 'Cart does not match completed payment.' });
    }
    if (pi.metadata.payee !== String(ctx.ownerId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment recipient.' });
    }
    assertAmountMatches(pi, dollarsToCents(ctx.total));
    externalRef = paymentIntentId;
    meta = {
      ...meta,
      stripePaymentIntentId: paymentIntentId,
      invoiceRef: `INV-${Date.now()}`,
    };
  }

  const payment = await Payment.create({
    payer: req.user.id,
    payee: ctx.ownerId,
    type: 'product',
    amount: ctx.total,
    status: 'completed',
    externalRef,
    meta,
  });

  for (let i = 0; i < items.length; i++) {
    const line = items[i];
    const qty = line.quantity || 1;
    const updated = await Product.findByIdAndUpdate(
      line.productId,
      { $inc: { stock: -qty } },
      { new: true }
    );
    const th = updated.lowStockThreshold ?? 5;
    if (updated.stock <= th) {
      await notifyUser(ctx.ownerId, {
        title: 'Low stock alert',
        body: `${updated.name} is at or below threshold (${th} left).`,
        category: 'inventory',
      });
    }
  }

  const order = await Order.create({
    player: req.user.id,
    businessOwner: ctx.ownerId,
    items: ctx.lineDocs,
    totalAmount: ctx.total,
    status: 'paid',
    payment: payment._id,
    shippingAddress: shippingAddress || undefined,
    customerNote: customerNote || undefined,
  });

  await notifyUser(ctx.ownerId, {
    title: 'New order',
    body: `Order received — total ${ctx.total}`,
    category: 'order',
  });

  res.status(201).json({ success: true, data: order });
});

const createCoachPaymentIntent = asyncHandler(async (req, res) => {
  if (!isStripeEnabled()) {
    return res.status(503).json({ success: false, message: 'Stripe is not configured on the server.' });
  }
  const { coachId, amount } = req.body;
  if (!coachId || !(amount > 0)) {
    return res.status(400).json({ success: false, message: 'coachId and amount are required' });
  }
  const coach = await User.findOne({
    _id: coachId,
    role: 'coach',
    verificationStatus: 'verified',
    isSuspended: false,
  });
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not available for payment' });
  const rel = await TrainingSession.findOne({ coach: coachId, player: req.user.id });
  if (!rel) {
    return res.status(400).json({
      success: false,
      message: 'Payments are only allowed to coaches you have a training session with.',
    });
  }
  const amountCents = dollarsToCents(amount);
  if (amountCents < 50) {
    return res.status(400).json({ success: false, message: 'Amount must be at least 0.50 USD for card payment.' });
  }
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    ...paymentIntentMethodSpec(),
    metadata: {
      purpose: 'coach_fee',
      playerId: String(req.user.id),
      coachId: String(coachId),
      amountCents: String(amountCents),
    },
  });
  res.json({
    success: true,
    data: { clientSecret: pi.client_secret, amount: Number(amount), currency: 'usd' },
  });
});

const listMyOrders = asyncHandler(async (req, res) => {
  const list = await Order.find({ player: req.user.id }).sort({ createdAt: -1 }).lean();
  const data = await enrichOrderItemsWithImages(list, Product);
  res.json({ success: true, data });
});

const submitCoachFeedback = asyncHandler(async (req, res) => {
  const { rating, comment, anonymous } = req.body;
  const coachId = req.params.coachId;
  const coach = await User.findOne({ _id: coachId, role: 'coach', verificationStatus: 'verified' });
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });
  const trained = await TrainingSession.findOne({ coach: coachId, player: req.user.id });
  if (!trained) {
    return res.status(400).json({
      success: false,
      message: 'You can only rate coaches you have (or had) a training session with.',
    });
  }
  const fb = await CoachFeedback.create({
    player: req.user.id,
    coach: coachId,
    rating,
    comment,
    anonymous: !!anonymous,
  });
  const agg = await CoachFeedback.aggregate([
    { $match: { coach: coach._id } },
    { $group: { _id: '$coach', avg: { $avg: '$rating' }, cnt: { $sum: 1 } } },
  ]);
  if (agg[0]) {
    await CoachProfile.findOneAndUpdate(
      { user: coachId },
      { averageRating: Math.round(agg[0].avg * 10) / 10, ratingCount: agg[0].cnt }
    );
  }
  await notifyUser(coachId, {
    title: 'New player feedback',
    body: `Rating: ${rating}`,
    category: 'feedback',
  });
  res.status(201).json({ success: true, data: fb });
});

const payCoach = asyncHandler(async (req, res) => {
  const { coachId, amount, paymentIntentId } = req.body;
  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
  }
  const coach = await User.findOne({
    _id: coachId,
    role: 'coach',
    verificationStatus: 'verified',
    isSuspended: false,
  });
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not available for payment' });
  const rel = await TrainingSession.findOne({ coach: coachId, player: req.user.id });
  if (!rel) {
    return res.status(400).json({
      success: false,
      message: 'Payments are only allowed to coaches you have a training session with.',
    });
  }

  let externalRef = 'mock-gateway';
  let meta = {
    cardLast4: req.body.cardLast4 || 'mock',
    invoiceRef: `COACH-${Date.now()}`,
  };

  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId is required. Complete Stripe payment first.',
      });
    }
    const pi = await retrieveSucceededPaymentIntent(paymentIntentId);
    if (
      pi.metadata.purpose !== 'coach_fee' ||
      pi.metadata.playerId !== String(req.user.id) ||
      pi.metadata.coachId !== String(coachId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid payment for this coach.' });
    }
    assertAmountMatches(pi, dollarsToCents(amount));
    externalRef = paymentIntentId;
    meta = { ...meta, stripePaymentIntentId: paymentIntentId };
  }

  const payment = await Payment.create({
    payer: req.user.id,
    payee: coachId,
    type: 'coach_fee',
    amount,
    status: 'completed',
    externalRef,
    meta,
  });
  await notifyUser(coachId, {
    title: 'Payment received',
    body: `Training fee: ${amount}`,
    category: 'payment',
  });
  res.status(201).json({ success: true, data: payment });
});

const listNotifications = asyncHandler(async (req, res) => {
  const list = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: list });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { read: true },
    { new: true }
  );
  if (!n) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: n });
});

const fileComplaint = asyncHandler(async (req, res) => {
  const { subject, description, againstUserId } = req.body;
  const c = await Complaint.create({
    filedBy: req.user.id,
    againstUser: againstUserId || undefined,
    subject,
    description,
  });
  res.status(201).json({ success: true, data: c });
});

module.exports = {
  getProfile,
  updateProfile,
  getRecommendations,
  listCoachCertificates,
  streamCoachCertificateFile,
  createTrainingRequest,
  listMyTrainingRequests,
  listTrainingSessions,
  listTrainingPlans,
  holdGroundBooking,
  createGroundBookingPaymentIntent,
  confirmGroundPayment,
  listMyGroundBookings,
  cancelGroundBooking,
  getPerformance,
  browseProducts,
  createOrderPaymentIntent,
  createOrder,
  listMyOrders,
  submitCoachFeedback,
  createCoachPaymentIntent,
  payCoach,
  listNotifications,
  markNotificationRead,
  fileComplaint,
};

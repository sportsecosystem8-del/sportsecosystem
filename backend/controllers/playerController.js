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
const BusinessProfile = require('../models/BusinessProfile');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const CoachFeedback = require('../models/CoachFeedback');
const VerificationDocument = require('../models/VerificationDocument');
const Complaint = require('../models/Complaint');
const AttendanceRecord = require('../models/AttendanceRecord');
const { evaluationAverageForTrend, evaluationSummaryScore } = require('../utils/evaluationScores');
const { asyncHandler } = require('../utils/asyncHandler');
const { hasOverlap } = require('../utils/groundBookings');
const { notifyUser } = require('../utils/notify');
const { verifiedBusinessOwnerIds } = require('../utils/verifiedSellers');
const { effectiveProductPrice, inSaleWindow } = require('../utils/pricing');
const { buildProductOrderContext } = require('../utils/productOrder');
const { finalizeGroundBookingConfirm, finalizeProductOrder } = require('../utils/atomicBooking');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { enrichOrderItemsWithImages } = require('../utils/productImages');
const { streamVerificationDocumentFile } = require('../utils/streamVerificationDocument');
const { haversineKm, parseCoord } = require('../utils/geo');
const { buildMeetingInstructions } = require('../utils/trainingRequestMessages');
const { getBusinessOwnerPaymentAccount } = require('../utils/ownerPaymentAccount');
const {
  generateOrderRef,
  buildEasypaisaCheckoutSession,
  verifyEasypaisaPayment,
} = require('../utils/easypaisaPayments');
const {
  getStripe,
  isStripeEnabled,
  dollarsToCents,
  retrieveSucceededPaymentIntent,
  assertAmountMatches,
  paymentIntentMethodSpec,
} = require('../utils/stripePayments');
const { generateCoachRecommendations } = require('../services/aiCoachEngine');
const { evaluatePlayerAttendanceAlert } = require('../utils/attendanceAlert');
const {
  toMinutesOfDay,
  validateScheduleSlots,
  slotsToMinuteRanges,
  uniqueDaysFromSlots,
} = require('../utils/scheduleSlots');

const populateCoachBrief = {
  path: 'coach',
  select: 'email verificationStatus',
  populate: {
    path: 'coachProfile',
    select:
      'fullName city specialties profilePhotoUrl averageRating academyLocation locationMapUrl monthlyTrainingFee',
  },
};
const populatePlayerBrief = {
  path: 'player',
  select: 'email',
  populate: { path: 'playerProfile', select: 'fullName city sportPreference skillLevel profilePhotoUrl' },
};

const RECOMMENDATION_WEIGHTS = Object.freeze({
  skill: 0.32,
  category: 0.15,
  time: 0.23,
  location: 0.18,
  performance: 0.12,
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

function toMinutesOfDayLocal(timeText) {
  return toMinutesOfDay(timeText);
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

function resolvePlayerTimeSlots(playerProfile, sessions) {
  const fromProfile = slotsToMinuteRanges(playerProfile?.trainingPreferences);
  if (fromProfile.length > 0) return fromProfile;
  return derivePlayerTimePreferences(sessions);
}

function scoreTimeOverlap(playerSlots, coachAvailability) {
  const playerDays = uniqueDaysFromSlots(playerSlots);
  const coachDays = uniqueDaysFromSlots(coachAvailability);

  if (!coachDays.size) {
    return { score: 0.1, detail: 'Coach weekly availability not set yet.' };
  }
  if (!playerDays.size) {
    return { score: 0.1, detail: 'Set your preferred training days in Account → Training schedule.' };
  }

  let matchingDays = 0;
  for (const day of playerDays) {
    if (coachDays.has(day)) matchingDays += 1;
  }

  const ratio = matchingDays / playerDays.size;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const matchedLabels = [...playerDays].filter((d) => coachDays.has(d)).map((d) => dayNames[d]);

  return {
    score: clamp01(ratio),
    matchingDays,
    playerDayCount: playerDays.size,
    detail: matchingDays
      ? `${matchingDays} of ${playerDays.size} preferred day(s) match (${matchedLabels.join(', ')}).`
      : 'No matching training days — try another coach or adjust your schedule.',
  };
}

function assertAiRecommendationsConfigured() {
  const provider = String(process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (provider === 'groq') {
    if (!process.env.GROQ_API_KEY) {
      const err = new Error('AI coach recommendations require GROQ_API_KEY on the server.');
      err.statusCode = 503;
      throw err;
    }
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('AI coach recommendations require OPENAI_API_KEY on the server.');
    err.statusCode = 503;
    throw err;
  }
}

/** Verified coach with a usable CoachProfile — safe for discovery / public profile. */
function isDiscoverableCoach(user) {
  if (!user || user.role !== 'coach') return false;
  if (user.verificationStatus !== 'verified' || user.isSuspended) return false;
  const profile = user.coachProfile;
  if (!profile || typeof profile !== 'object') return false;
  if (!String(profile.fullName || '').trim()) return false;
  if (!Array.isArray(profile.specialties) || profile.specialties.length === 0) return false;
  return true;
}

function scoredToRecommendationRows(scored, limit) {
  return scored.slice(0, limit).map((s) => ({
    userId: s.coachUser._id,
    profile: s.profile,
    matchScore: s.matchScore,
    breakdown: s.breakdown,
    reasons: s.reasons,
    distanceKm: s.distanceKm ?? null,
  }));
}

function scoreLocation(playerProfile, coachProfile) {
  const playerCity = playerProfile?.city;
  const distanceKm = haversineKm(
    playerProfile?.latitude,
    playerProfile?.longitude,
    coachProfile?.latitude,
    coachProfile?.longitude
  );
  const coachCity = coachProfile?.city;
  const academy = String(coachProfile?.academyLocation || '').trim();
  const academyName = String(coachProfile?.academyName || '').trim();

  if (distanceKm != null) {
    let score = 0.2;
    if (distanceKm <= 2) score = 1;
    else if (distanceKm <= 10) score = 0.8;
    else if (distanceKm <= 25) score = 0.5;
    else if (distanceKm <= 50) score = 0.3;
    const distLabel = distanceKm < 10 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceKm)} km`;
    return {
      score,
      distanceKm,
      detail: academy || academyName
        ? `${distLabel} away — ${academyName || academy}.`
        : `${distLabel} away.`,
    };
  }

  const p = String(playerCity || '').trim().toLowerCase();
  const c = String(coachCity || '').trim().toLowerCase();
  if (!p || !c) {
    return {
      score: 0.45,
      distanceKm: null,
      detail: academy ? `Academy: ${academy}.` : 'Location partially available.',
    };
  }
  if (p === c) {
    return {
      score: 1,
      distanceKm: null,
      detail: academy ? `Same city — ${academy}.` : `Same city — ${coachCity}.`,
    };
  }
  if (p.includes(c) || c.includes(p)) {
    return {
      score: 0.75,
      distanceKm: null,
      detail: academy ? `Near city — ${academy}.` : 'Near city match.',
    };
  }
  return {
    score: 0.25,
    distanceKm: null,
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
  const latestAvg = evaluationAverageForTrend(latest);
  const prev = evals[1];
  const prevAvg = prev ? evaluationAverageForTrend(prev) : latestAvg;
  const trend = clamp01((latestAvg - prevAvg + 100) / 200) * 2 - 1;
  const normalized = clamp01(latestAvg / 100);
  const level = normalized > 0.73 ? 'advanced' : normalized > 0.45 ? 'intermediate' : 'beginner';
  return { normalized, level, trend, source: 'weekly_evaluations' };
}

/** True when cricket coach focus matches player role (allrounder coaches match any). */
function coachMatchesPlayerCategory(profile, playerCategory) {
  const categories = Array.isArray(profile?.coachingCategories) ? profile.coachingCategories : [];
  if (!playerCategory || !categories.length) return false;
  return categories.includes('allrounder') || categories.includes(playerCategory);
}

function scoreCategoryFit(profile, sportPreference, playerCategory) {
  if (sportPreference !== 'cricket' || !playerCategory) {
    return { score: 1, detail: 'Category matching applies to cricket players.' };
  }
  const categories = Array.isArray(profile?.coachingCategories) ? profile.coachingCategories : [];
  if (!categories.length) {
    return { score: 0.4, detail: 'Coach has not set a coaching focus (batting/bowling/all-rounder).' };
  }
  const match = coachMatchesPlayerCategory(profile, playerCategory);
  const labels = { batsman: 'batting', bowler: 'bowling', allrounder: 'all-round' };
  return {
    score: match ? 1 : 0.15,
    detail: match
      ? `Coaching focus matches your ${labels[playerCategory] || playerCategory} category.`
      : `Coach focuses on ${categories.map((c) => labels[c] || c).join(', ')} — not your category.`,
  };
}

function scoreSkill(profile, sportPreference, playerLevel) {
  const specialties = Array.isArray(profile?.specialties) ? profile.specialties : [];
  const sportMatch = specialties.includes(sportPreference) ? 1 : 0;
  const rating = clamp01((profile?.averageRating || 0) / 5);
  const confidence = clamp01((profile?.ratingCount || 0) / 20);
  const years = clamp01((profile?.yearsExperience || 0) / 12);
  const level = String(playerLevel || 'beginner').trim().toLowerCase();

  const preferred = Array.isArray(profile?.preferredPlayerLevels)
    ? profile.preferredPlayerLevels.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
    : [];
  let levelFit;
  let levelDetail;
  if (preferred.length > 0) {
    levelFit = preferred.includes(level) ? 1 : 0;
    levelDetail = levelFit
      ? `Coach trains ${level} players.`
      : `Coach prefers ${preferred.join(', ')} — not your ${level} level.`;
  } else {
    // Prefer coaches who set levels; without them, mild experience-based estimate only.
    const coachLevel = years > 0.66 ? 2 : years > 0.33 ? 1 : 0;
    const levelGap = Math.abs(coachLevel - levelToIndex(level));
    levelFit = 1 - clamp01(levelGap / 2);
    levelDetail = 'Skill fit estimated from coach experience (set preferred levels in profile for better matching).';
  }

  // Level fit dominates so matching preferredPlayerLevels meaningfully ranks coaches.
  const score = clamp01(0.2 * sportMatch + 0.15 * rating + 0.1 * confidence + 0.05 * years + 0.5 * levelFit);
  const detail = sportMatch
    ? preferred.length
      ? levelDetail
      : 'Sport specialty aligned.'
    : 'Partial specialty alignment.';
  return { score, detail };
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
  const lines = [
    `Skill fit: ${breakdown.skill}% (${details.skill})`,
    `Schedule fit: ${breakdown.time}% (${details.time})`,
    `Location fit: ${breakdown.location}% (${details.location})`,
    `Performance fit: ${breakdown.performance}% (${details.performance})`,
  ];
  if (breakdown.category != null) {
    lines.splice(1, 0, `Category fit: ${breakdown.category}% (${details.category})`);
  }
  return lines;
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
  const allowed = ['fullName', 'phone', 'sportPreference', 'skillLevel', 'city', 'address', 'playerCategory', 'latitude', 'longitude'];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (req.body.latitude !== undefined) {
    const lat = parseCoord(req.body.latitude);
    if (req.body.latitude === null || req.body.latitude === '') patch.latitude = undefined;
    else if (lat === undefined) return res.status(400).json({ success: false, message: 'Invalid latitude.' });
    else patch.latitude = lat;
  }
  if (req.body.longitude !== undefined) {
    const lng = parseCoord(req.body.longitude);
    if (req.body.longitude === null || req.body.longitude === '') patch.longitude = undefined;
    else if (lng === undefined) return res.status(400).json({ success: false, message: 'Invalid longitude.' });
    else patch.longitude = lng;
  }
  if (req.body.trainingPreferences !== undefined) {
    const check = validateScheduleSlots(req.body.trainingPreferences);
    if (!check.ok) return res.status(400).json({ success: false, message: check.message });
    patch.trainingPreferences = check.slots;
  }
  const existing = await PlayerProfile.findOne({ user: req.user.id });
  const sport = patch.sportPreference || existing?.sportPreference || 'cricket';
  const category = patch.playerCategory ?? existing?.playerCategory;
  if (sport === 'cricket' && !category) {
    return res.status(400).json({
      success: false,
      message: 'Playing category is required for cricket (batsman, bowler, or allrounder).',
    });
  }
  if (patch.playerCategory !== undefined && sport !== 'cricket') {
    patch.playerCategory = undefined;
  }
  const profile = await PlayerProfile.findOneAndUpdate({ user: req.user.id }, patch, { new: true });
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
  const profile = await PlayerProfile.findOneAndUpdate(
    { user: req.user.id },
    { profilePhotoUrl: url },
    { new: true }
  );
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: profile });
});

const removeProfilePhoto = asyncHandler(async (req, res) => {
  const profile = await PlayerProfile.findOneAndUpdate(
    { user: req.user.id },
    { $unset: { profilePhotoUrl: '' } },
    { new: true }
  );
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
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

  const playerTimeSlots = resolvePlayerTimeSlots(p, recentSessions);
  const playerSignal = derivePlayerPerformanceSignal(recentEvals, p.skillLevel);

  const scored = coaches
    .filter((c) => isDiscoverableCoach(c) && (c.coachProfile.specialties || []).includes(p.sportPreference))
    .filter((c) => {
      // Cricket: hard-filter by coaching focus so batsmen only see batting (etc.). Badminton: sport-only.
      if (p.sportPreference !== 'cricket' || !p.playerCategory) return true;
      return coachMatchesPlayerCategory(c.coachProfile, p.playerCategory);
    })
    .map((c) => {
      // Always match on profile skillLevel — weekly evals feed performance fit only.
      const skill = scoreSkill(c.coachProfile, p.sportPreference, p.skillLevel || 'beginner');
      const category = scoreCategoryFit(c.coachProfile, p.sportPreference, p.playerCategory);
      const time = scoreTimeOverlap(playerTimeSlots, c.coachProfile.availability);
      const location = scoreLocation(p, c.coachProfile);
      const performance = scorePerformanceFit(playerSignal, c.coachProfile);

      const finalScore =
        100 *
        (RECOMMENDATION_WEIGHTS.skill * skill.score +
          RECOMMENDATION_WEIGHTS.category * category.score +
          RECOMMENDATION_WEIGHTS.time * time.score +
          RECOMMENDATION_WEIGHTS.location * location.score +
          RECOMMENDATION_WEIGHTS.performance * performance.score);

      const breakdown = {
        skill: Math.round(skill.score * 100),
        category: Math.round(category.score * 100),
        time: Math.round(time.score * 100),
        location: Math.round(location.score * 100),
        performance: Math.round(performance.score * 100),
      };
      const factorDetails = {
        skill: skill.detail,
        category: category.detail,
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
        matchingDays: time.matchingDays ?? 0,
        distanceKm: location.distanceKm ?? null,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Math.max(limit, 8));

  let generationMethod = 'ai';
  let generationMeta = null;

  if (!scored.length) {
    const sport = String(p.sportPreference || 'sport').toLowerCase();
    return res.json({
      success: true,
      generationMethod: 'baseline',
      data: [],
      message: `No verified ${sport} coaches yet.`,
    });
  }

  let useAi = aiRecommendationsEnabled();
  if (!useAi) {
    console.warn('[ai][recommendations] AI disabled; using baseline scores');
  } else {
    try {
      assertAiRecommendationsConfigured();
    } catch (e) {
      console.warn('[ai][recommendations] not configured; using baseline:', e.message);
      useAi = false;
    }
  }

  let finalRows = [];
  if (useAi) {
    try {
      const aiInput = {
        limit,
        player: {
          sportPreference: p.sportPreference,
          skillLevel: p.skillLevel,
          playerCategory: p.playerCategory || '',
          city: p.city || '',
          trainingPreferences: p.trainingPreferences || [],
          performanceLevel: playerSignal.level,
          performanceTrend: playerSignal.trend,
        },
        candidates: scored.map((s) => ({
          userId: String(s.coachUser._id),
          fullName: s.profile?.fullName || '',
          city: s.profile?.city || '',
          specialties: s.profile?.specialties || [],
          coachingCategories: s.profile?.coachingCategories || [],
          preferredPlayerLevels: s.profile?.preferredPlayerLevels || [],
          yearsExperience: s.profile?.yearsExperience || 0,
          averageRating: s.profile?.averageRating || 0,
          ratingCount: s.profile?.ratingCount || 0,
          baselineScore: s.matchScore,
          breakdown: s.breakdown,
          matchReasons: s.reasons,
          matchingDays: s.matchingDays,
        })),
      };
      const ai = await generateCoachRecommendations(aiInput);
      const byId = new Map(scored.map((s) => [String(s.coachUser._id), s]));
      // Keep AI-selected candidates, but always order by baseline matchScore so UI ranking matches scores.
      finalRows = ai.rankedCoaches
        .map((row) => {
          const base = byId.get(String(row.userId));
          if (!base) return null;
          return {
            userId: base.coachUser._id,
            profile: base.profile,
            matchScore: base.matchScore,
            breakdown: base.breakdown,
            reasons: base.reasons,
            distanceKm: base.distanceKm ?? null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      if (!finalRows.length) {
        console.warn('[ai][recommendations] empty AI ranking; using baseline scores');
        generationMethod = 'baseline';
        finalRows = scoredToRecommendationRows(scored, limit);
      } else {
        generationMeta = { provider: ai.provider, model: ai.model, latencyMs: ai.latencyMs };
      }
    } catch (e) {
      console.warn(
        '[ai][recommendations] falling back to baseline:',
        e.message?.slice?.(0, 120) || e.message
      );
      generationMethod = 'baseline';
      finalRows = scoredToRecommendationRows(scored, limit);
    }
  } else {
    generationMethod = 'baseline';
    finalRows = scoredToRecommendationRows(scored, limit);
  }

  if (!finalRows.length) {
    const sport = String(p.sportPreference || 'sport').toLowerCase();
    return res.json({
      success: true,
      generationMethod,
      data: [],
      message: `No verified ${sport} coaches yet.`,
    });
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
  const coach = await User.findOne({
    _id: coachId,
    role: 'coach',
    verificationStatus: 'verified',
    isSuspended: false,
  })
    .populate('coachProfile')
    .lean();
  if (!isDiscoverableCoach(coach)) return null;
  return coach;
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

const COACH_PUBLIC_PROFILE_SELECT =
  'fullName profilePhotoUrl academyImageUrls academyName phone specialties preferredPlayerLevels coachingCategories academyLocation city latitude longitude bio yearsExperience availability averageRating ratingCount locationMapUrl monthlyTrainingFee updatedAt';

const getCoachPublicProfile = asyncHandler(async (req, res) => {
  const coach = await findVerifiedCoachForPlayer(req.params.coachId);
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });
  const profile = await CoachProfile.findOne({ user: coach._id }).select(COACH_PUBLIC_PROFILE_SELECT).lean();
  if (!profile) return res.status(404).json({ success: false, message: 'Coach profile not found' });
  res.json({
    success: true,
    data: {
      coachId: coach._id,
      email: coach.email,
      profile,
    },
  });
});

const listCoachPublicFeedback = asyncHandler(async (req, res) => {
  const coach = await findVerifiedCoachForPlayer(req.params.coachId);
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });

  const list = await CoachFeedback.find({ coach: coach._id })
    .populate({
      path: 'player',
      select: 'email',
      populate: { path: 'playerProfile', select: 'fullName profilePhotoUrl' },
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const data = list.map((row) => ({
    _id: row._id,
    rating: row.rating,
    comment: row.comment || '',
    coachReply: row.coachReply || '',
    createdAt: row.createdAt,
    reviewerName: row.anonymous
      ? 'Anonymous player'
      : row.player?.playerProfile?.fullName || row.player?.email || 'Player',
    reviewerPhoto: row.anonymous ? null : row.player?.playerProfile?.profilePhotoUrl || null,
  }));

  res.json({ success: true, data });
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
  const data = list.map((row) => {
    const cp = row.coach?.coachProfile;
    return {
      ...row,
      meetingInstructions:
        row.status === 'accepted' ? buildMeetingInstructions(row, cp) : null,
      feesCleared: Boolean(row.feesClearedAt),
      sessionStarted: Boolean(row.firstSession),
      coachRollNo: row.coachRollNo || '',
    };
  });
  res.json({ success: true, data });
});

const listTrainingSessions = asyncHandler(async (req, res) => {
  const list = await TrainingSession.find({ player: req.user.id })
    .populate(populateCoachBrief)
    .sort({ scheduledAt: 1 })
    .lean();
  const sessionIds = list.map((s) => s._id);
  let attendanceBySession = new Map();
  if (sessionIds.length) {
    const rows = await AttendanceRecord.find({ session: { $in: sessionIds }, player: req.user.id })
      .select('session present')
      .lean();
    attendanceBySession = new Map(rows.map((row) => [String(row.session), row]));
  }
  try {
    await evaluatePlayerAttendanceAlert(req.user.id);
  } catch (e) {
    console.warn('[attendance-alert] failed:', e.message);
  }
  res.json({
    success: true,
    data: list.map((s) => ({
      ...s,
      attendance: attendanceBySession.get(String(s._id)) || null,
    })),
  });
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
  const durationHours =
    (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  const computedAmount =
    amount != null && Number.isFinite(Number(amount))
      ? Number(amount)
      : Math.round((ground.pricePerHour || 0) * durationHours);

  const booking = await GroundBooking.create({
    ground: groundId,
    bookedBy: req.user.id,
    bookedByRole: 'player',
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
    bookedByRole: 'player',
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
    },
  });

  res.json({ success: true, data: session });
});

const confirmGroundPayment = asyncHandler(async (req, res) => {
  const { guestName, guestPhone, guestAddress, guestCity, orderRef, easypaisaTxnId, mockPayToken } = req.body;
  const booking = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'player',
    status: 'held',
  }).populate('ground');
  if (!booking) return res.status(404).json({ success: false, message: 'Hold not found' });
  if (booking.holdExpiresAt < new Date()) {
    booking.status = 'cancelled';
    await booking.save();
    return res.status(410).json({ success: false, message: 'Hold expired' });
  }
  if (!guestName || !String(guestName).trim() || !guestPhone || !String(guestPhone).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Guest name and phone are required to confirm booking.',
    });
  }
  if (!orderRef && booking.amount > 0) {
    return res.status(400).json({ success: false, message: 'Payment reference is required.' });
  }
  const groundId = booking.ground?._id || booking.ground;

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
      ? `Easypaisa payment received — PKR ${booking.amount}. Txn: ${txnLabel}. Present your confirmation reference at the venue.`
      : 'Booking confirmed — no advance payment required.';

  let confirmedBooking;
  try {
    confirmedBooking = await finalizeGroundBookingConfirm({
      booking,
      paymentId,
      txnLabel,
      guestName: String(guestName).trim(),
      guestPhone: String(guestPhone).trim(),
      guestAddress: guestAddress ? String(guestAddress).trim() : undefined,
      guestCity: guestCity ? String(guestCity).trim() : undefined,
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
        title: confirmedBooking.amount > 0 ? 'New ground booking (paid)' : 'New ground booking',
        body: `${confirmedBooking.guestName} (${confirmedBooking.guestPhone}) booked ${ground.name} for ${new Date(confirmedBooking.startTime).toLocaleString()}. Ref: ${confirmedBooking.confirmationToken}${confirmedBooking.amount > 0 ? `. Easypaisa: ${txnLabel}` : ''}`,
        category: 'booking',
        actionUrl: '/business/ground-bookings',
      });
    } catch (e) {
      console.warn('[notify][ground-booking-owner] failed:', e.message);
    }
  }

  res.json({ success: true, data: confirmedBooking });
});

const listMyGroundBookings = asyncHandler(async (req, res) => {
  const list = await GroundBooking.find({ bookedBy: req.user.id, bookedByRole: 'player' })
    .populate('ground')
    .sort({ startTime: -1 })
    .lean();
  res.json({ success: true, data: list });
});

const cancelGroundBooking = asyncHandler(async (req, res) => {
  const b = await GroundBooking.findOne({
    _id: req.params.id,
    bookedBy: req.user.id,
    bookedByRole: 'player',
  }).populate('ground');
  if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (b.status === 'cancelled') return res.json({ success: true, data: b });
  if (b.status === 'confirmed' && new Date(b.startTime) < new Date()) {
    return res.status(400).json({ success: false, message: 'Cannot cancel a past booking.' });
  }
  b.status = 'cancelled';
  await b.save();

  const ground = b.ground;
  if (ground?.businessOwner) {
    try {
      await notifyUser(ground.businessOwner, {
        title: 'Ground booking cancelled',
        body: `${b.guestName || 'A player'} cancelled ${ground.name} (${new Date(b.startTime).toLocaleString()}). Slot is available again. Ref: ${b.confirmationToken || b._id}`,
        category: 'booking',
        actionUrl: '/business/ground-bookings',
      });
    } catch (e) {
      console.warn('[notify][ground-booking-cancel] failed:', e.message);
    }
  }

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
  if (req.query.sport) {
    const s = String(req.query.sport).toLowerCase();
    if (s === 'cricket' || s === 'badminton') {
      filter.sportType = { $in: [s, 'general'] };
    } else if (s === 'general') {
      filter.sportType = 'general';
    } else {
      filter.sportType = s;
    }
  }
  if (req.query.ownerId) filter.businessOwner = req.query.ownerId;
  if (req.query.q) filter.name = new RegExp(String(req.query.q).trim(), 'i');
  if (req.query.category) filter.category = new RegExp(String(req.query.category).trim(), 'i');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 36, maxLimit: 100 });
  const [list, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  const storeOwnerIds = [...new Set(list.map((p) => String(p.businessOwner)))];
  const stores = storeOwnerIds.length
    ? await BusinessProfile.find({ user: { $in: storeOwnerIds } })
        .select('user storeName storeLogoUrl storeBannerUrl storeDescription businessName')
        .lean()
    : [];
  const storeByOwner = new Map(stores.map((bp) => [String(bp.user), bp]));
  const data = list.map((p) => {
    const store = storeByOwner.get(String(p.businessOwner));
    return {
      ...p,
      storeName: store?.storeName || store?.businessName || 'Store',
      storeLogoUrl: store?.storeLogoUrl,
      storeBannerUrl: store?.storeBannerUrl,
      effectivePrice: effectiveProductPrice(p),
      onSale: inSaleWindow(p) && (p.salePrice != null || (p.discountPercent != null && p.discountPercent > 0)),
    };
  });
  res.json({
    success: true,
    data,
    pagination: paginationMeta({ page, limit, total }),
  });
});

const getBusinessStore = asyncHandler(async (req, res) => {
  const ownerId = req.params.ownerId;
  const user = await User.findById(ownerId).select('verificationStatus isSuspended role').lean();
  if (!user || user.role !== 'business_owner' || user.verificationStatus !== 'verified' || user.isSuspended) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }
  const store = await BusinessProfile.findOne({ user: ownerId })
    .select(
      'storeName storeDescription storeLogoUrl storeBannerUrl shopImageUrls businessName shippingPolicyText returnPolicyText'
    )
    .lean();
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  const products = await Product.find({ businessOwner: ownerId, isActive: true }).sort({ createdAt: -1 }).lean();
  const data = products.map((p) => ({
    ...p,
    storeName: store.storeName || store.businessName || 'Store',
    effectivePrice: effectiveProductPrice(p),
    onSale: inSaleWindow(p) && (p.salePrice != null || (p.discountPercent != null && p.discountPercent > 0)),
  }));
  res.json({
    success: true,
    data: {
      ownerId,
      store: {
        storeName: store.storeName || store.businessName || 'Store',
        storeDescription: store.storeDescription || '',
        storeLogoUrl: store.storeLogoUrl,
        storeBannerUrl: store.storeBannerUrl,
        shopImageUrls: Array.isArray(store.shopImageUrls) ? store.shopImageUrls : [],
        shippingPolicyText: store.shippingPolicyText,
        returnPolicyText: store.returnPolicyText,
      },
      products: data,
    },
  });
});

const initiateOrderEasypaisaPayment = asyncHandler(async (req, res) => {
  const { items } = req.body;
  let ctx;
  try {
    ctx = await buildProductOrderContext(items);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ success: false, message: e.message });
  }

  const payee = await getBusinessOwnerPaymentAccount(ctx.ownerId);
  if (!payee) {
    return res.status(503).json({
      success: false,
      message: 'Store has not linked an Easypaisa account for payments yet.',
    });
  }

  const orderRef = generateOrderRef('ORD');
  const session = buildEasypaisaCheckoutSession({
    orderRef,
    amount: ctx.total,
    currency: 'PKR',
    payeeMobile: payee.mobile,
    payeeTitle: payee.accountTitle,
  });

  const existingPending = await Payment.findOne({
    payer: req.user.id,
    status: 'pending',
    'meta.itemHash': ctx.itemHash,
    type: 'product',
  });
  if (existingPending) await Payment.deleteOne({ _id: existingPending._id });

  await Payment.create({
    payer: req.user.id,
    payee: ctx.ownerId,
    type: 'product',
    amount: ctx.total,
    status: 'pending',
    externalRef: orderRef,
    meta: {
      paymentMethod: 'easypaisa',
      purpose: 'product_order',
      orderRef,
      itemHash: ctx.itemHash,
      payeeMobile: payee.mobile,
      payeeTitle: payee.accountTitle,
      mockPayToken: session.mockPayToken,
    },
  });

  res.json({ success: true, data: { ...session, itemHash: ctx.itemHash } });
});

const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    customerNote,
    paymentMethod = 'easypaisa',
    orderRef,
    easypaisaTxnId,
    mockPayToken,
  } = req.body;
  let ctx;
  try {
    ctx = await buildProductOrderContext(items);
  } catch (e) {
    const code = e.statusCode || 400;
    return res.status(code).json({ success: false, message: e.message });
  }

  const ship = shippingAddress || {};
  if (!ship.fullName?.trim() || !ship.line1?.trim() || !ship.city?.trim() || !ship.phone?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Delivery requires full name, address, city, and phone.',
    });
  }

  const invoiceRef = `INV-${Date.now()}`;

  if (paymentMethod === 'easypaisa') {
    if (!orderRef) {
      return res.status(400).json({ success: false, message: 'Payment reference is required.' });
    }
    const pending = await Payment.findOne({
      payer: req.user.id,
      status: 'pending',
      externalRef: orderRef,
      type: 'product',
      'meta.itemHash': ctx.itemHash,
    });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Payment session not found. Start checkout again.' });
    }
    const verified = await verifyEasypaisaPayment({
      orderRef,
      txnId: easypaisaTxnId,
      mockPayToken,
      expectedAmount: ctx.total,
      pendingMeta: pending.meta,
    });
    pending.status = 'completed';
    pending.externalRef = verified.txnId;
    pending.meta = {
      ...pending.meta,
      easypaisaTxnId: verified.txnId,
      verifiedAt: new Date().toISOString(),
      mode: verified.mode,
      invoiceRef,
    };
    await pending.save();

    const payment = pending;

    let orderResult;
    try {
      orderResult = await finalizeProductOrder({
        payerId: req.user.id,
        ownerId: ctx.ownerId,
        items,
        lineDocs: ctx.lineDocs,
        total: ctx.total,
        paymentId: payment._id,
        shippingAddress: ship,
        customerNote: customerNote || undefined,
      });
    } catch (e) {
      return res.status(e.statusCode || 500).json({ success: false, message: e.message });
    }

    for (const updated of orderResult.stockUpdates) {
      const th = updated.lowStockThreshold ?? 5;
      if (updated.stock <= th) {
        await notifyUser(ctx.ownerId, {
          title: 'Low stock alert',
          body: `${updated.name} is at or below threshold (${th} left).`,
          category: 'inventory',
        });
      }
    }

    const order = orderResult.order;

    try {
      await notifyUser(ctx.ownerId, {
        title: 'New paid order',
        body: `${ship.fullName} placed order ${invoiceRef} — PKR ${ctx.total}. Easypaisa: ${verified.txnId}. Phone: ${ship.phone}`,
        category: 'order',
        actionUrl: '/business/orders',
      });
    } catch (e) {
      console.warn('[notify][product-order-owner] failed:', e.message);
    }

    const enriched = await enrichOrderItemsWithImages(order.toObject());
    return res.status(201).json({ success: true, data: enriched });
  }

  return res.status(400).json({
    success: false,
    message: 'Online Easypaisa payment is required. Cash on delivery is no longer supported.',
  });
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
  uploadProfilePhoto,
  removeProfilePhoto,
  getRecommendations,
  listCoachCertificates,
  streamCoachCertificateFile,
  getCoachPublicProfile,
  listCoachPublicFeedback,
  createTrainingRequest,
  listMyTrainingRequests,
  listTrainingSessions,
  listTrainingPlans,
  holdGroundBooking,
  initiateGroundEasypaisaPayment,
  confirmGroundPayment,
  listMyGroundBookings,
  cancelGroundBooking,
  getPerformance,
  browseProducts,
  getBusinessStore,
  initiateOrderEasypaisaPayment,
  createOrder,
  listMyOrders,
  submitCoachFeedback,
  createCoachPaymentIntent,
  payCoach,
  listNotifications,
  markNotificationRead,
  fileComplaint,
};

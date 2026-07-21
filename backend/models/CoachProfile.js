const mongoose = require('mongoose');
const scheduleSlotSchema = require('./schemas/scheduleSlotSchema');

const coachProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    /** Public coach headshot — JPG/PNG via POST /coaches/me/profile-photo */
    profilePhotoUrl: String,
    /** Academy / facility brand name shown to players */
    academyName: { type: String, trim: true },
    /** Academy / facility photos shown on public coach profile */
    academyImageUrls: [{ type: String, trim: true }],
    phone: String,
    specialties: [{ type: String, enum: ['cricket', 'badminton'] }],
    /** Player skill levels this coach prefers to train */
    preferredPlayerLevels: [{ type: String, enum: ['beginner', 'intermediate', 'advanced'] }],
    /** Cricket coaching focus — used for category-wise player recommendations */
    coachingCategories: [{ type: String, enum: ['batsman', 'bowler', 'allrounder'] }],
    /** Default training session length in minutes */
    defaultSessionDurationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    academyLocation: String,
    city: String,
    /** Optional academy map pin for nearest-player matching */
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    bio: String,
    yearsExperience: { type: Number, default: 0 },
    availability: [scheduleSlotSchema],
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    bankAccountLabel: String,
    /** Map link for academy location verification */
    locationMapUrl: { type: String, required: true, trim: true },
    /** Max concurrent students (soft cap) */
    maxStudents: { type: Number, default: 40, min: 1 },
    /** Monthly platform access — admin-priced via SystemSettings `coach_platform_subscription_pkr` */
    platformSubscriptionRenewsAt: Date,
    /** Monthly training fee charged to players (PKR) — shown on coach profile & recommendations */
    monthlyTrainingFee: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

coachProfileSchema.index({ specialties: 1, city: 1 });

module.exports = mongoose.model('CoachProfile', coachProfileSchema);

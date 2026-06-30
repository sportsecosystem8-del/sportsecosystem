const mongoose = require('mongoose');
const scheduleSlotSchema = require('./schemas/scheduleSlotSchema');

const coachProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    /** Public coach headshot — JPG/PNG via POST /coaches/me/profile-photo */
    profilePhotoUrl: String,
    phone: String,
    specialties: [{ type: String, enum: ['cricket', 'football', 'badminton'] }],
    /** Player skill levels this coach prefers to train */
    preferredPlayerLevels: [{ type: String, enum: ['beginner', 'intermediate', 'advanced'] }],
    academyLocation: String,
    city: String,
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
    /** Monthly platform access — admin-priced via SystemSettings `coach_platform_subscription_usd` */
    platformSubscriptionRenewsAt: Date,
    /** Monthly training fee charged to players (PKR) — shown on coach profile & recommendations */
    monthlyTrainingFee: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

coachProfileSchema.index({ specialties: 1, city: 1 });

module.exports = mongoose.model('CoachProfile', coachProfileSchema);

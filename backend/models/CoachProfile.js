const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6 },
    start: String,
    end: String,
  },
  { _id: false }
);

const coachProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    /** Public coach headshot — JPG/PNG via POST /coaches/me/profile-photo */
    profilePhotoUrl: String,
    phone: String,
    specialties: [{ type: String, enum: ['cricket', 'football', 'badminton'] }],
    academyLocation: String,
    city: String,
    bio: String,
    yearsExperience: { type: Number, default: 0 },
    availability: [availabilitySlotSchema],
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    bankAccountLabel: String,
    /** Map link for academy location verification */
    locationMapUrl: { type: String, required: true, trim: true },
    /** Max concurrent students (soft cap) */
    maxStudents: { type: Number, default: 40, min: 1 },
    /** Monthly platform access — admin-priced via SystemSettings `coach_platform_subscription_usd` */
    platformSubscriptionRenewsAt: Date,
  },
  { timestamps: true }
);

coachProfileSchema.index({ specialties: 1, city: 1 });

module.exports = mongoose.model('CoachProfile', coachProfileSchema);

const mongoose = require('mongoose');
const scheduleSlotSchema = require('./schemas/scheduleSlotSchema');

const playerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    phone: String,
    sportPreference: { type: String, enum: ['cricket', 'badminton'], required: true },
    skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    /** Cricket playing role — drives evaluation rubric & weekly plan focus */
    playerCategory: { type: String, enum: ['batsman', 'bowler', 'allrounder'] },
    /** Preferred weekly training windows for coach matching */
    trainingPreferences: [scheduleSlotSchema],
    city: String,
    address: String,
    /** Public player headshot — JPG/PNG via POST /players/me/profile-photo */
    profilePhotoUrl: String,
  },
  { timestamps: true }
);

playerProfileSchema.index({ sportPreference: 1, city: 1 });

module.exports = mongoose.model('PlayerProfile', playerProfileSchema);

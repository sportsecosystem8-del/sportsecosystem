const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema(
  {
    coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainingRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingRequest' },
    scheduledAt: { type: Date, required: true },
    /** Session length in minutes */
    durationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    location: String,
    groundBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'GroundBooking' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

trainingSessionSchema.index({ coach: 1, scheduledAt: 1 });
trainingSessionSchema.index({ player: 1, scheduledAt: 1 });

module.exports = mongoose.model('TrainingSession', trainingSessionSchema);

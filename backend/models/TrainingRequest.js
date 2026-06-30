const mongoose = require('mongoose');

const trainingRequestSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: String,
    preferredStart: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    /** Coach-proposed first meeting — shown to player after accept; session created after fees cleared */
    meetingAt: Date,
    meetingLocation: String,
    meetingAcademyName: String,
    feesClearedAt: Date,
    firstSession: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingSession' },
  },
  { timestamps: true }
);

trainingRequestSchema.index({ coach: 1, status: 1 });
trainingRequestSchema.index({ player: 1 });

module.exports = mongoose.model('TrainingRequest', trainingRequestSchema);

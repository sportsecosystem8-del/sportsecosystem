const mongoose = require('mongoose');

const skillScoreSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    skill: { type: String, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false }
);

const performanceEvaluationSchema = new mongoose.Schema(
  {
    coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date, required: true },
    /** Player sport at evaluation time */
    sport: { type: String, enum: ['cricket', 'football', 'badminton'], default: 'cricket' },
    /** Deep sub-technique scores */
    skillScores: [skillScoreSchema],
    /** Per-category averages (Batting, Passing, etc.) */
    categoryAverages: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Overall average across all scored skills */
    overallScore: { type: Number, min: 0, max: 100 },
    /** Legacy summary fields — kept for charts & backward compatibility */
    technique: { type: Number, min: 0, max: 100 },
    fitness: { type: Number, min: 0, max: 100 },
    attitude: { type: Number, min: 0, max: 100 },
    comments: String,
  },
  { timestamps: true }
);

performanceEvaluationSchema.index({ player: 1, weekStartDate: -1 });

module.exports = mongoose.model('PerformanceEvaluation', performanceEvaluationSchema);

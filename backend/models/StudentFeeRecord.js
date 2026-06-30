const mongoose = require('mongoose');

const studentFeeRecordSchema = new mongoose.Schema(
  {
    coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Display name snapshot (defaults from player profile on create) */
    studentName: { type: String, required: true, trim: true },
    joiningDate: { type: Date, required: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    notes: String,
    lastPaidAt: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

studentFeeRecordSchema.index({ coach: 1, player: 1 }, { unique: true });
studentFeeRecordSchema.index({ coach: 1, status: 1 });

module.exports = mongoose.model('StudentFeeRecord', studentFeeRecordSchema);

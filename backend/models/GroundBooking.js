const mongoose = require('mongoose');

const groundBookingSchema = new mongoose.Schema(
  {
    ground: { type: mongoose.Schema.Types.ObjectId, ref: 'IndoorGround', required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookedByRole: { type: String, enum: ['player', 'coach'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['held', 'confirmed', 'cancelled'],
      default: 'held',
    },
    holdExpiresAt: Date,
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    amount: { type: Number, default: 0 },
    /** Human-readable booking reference e.g. GB-XXX */
    confirmationToken: { type: String, unique: true, sparse: true },
    guestName: String,
    guestPhone: String,
    guestAddress: String,
    guestCity: String,
    paymentNote: String,
  },
  { timestamps: true }
);

groundBookingSchema.index({ ground: 1, startTime: 1, endTime: 1 });
groundBookingSchema.index({ bookedBy: 1, bookedByRole: 1, status: 1 });
groundBookingSchema.index({ holdExpiresAt: 1 });

module.exports = mongoose.model('GroundBooking', groundBookingSchema);

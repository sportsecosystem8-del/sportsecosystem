const mongoose = require('mongoose');

const indoorGroundSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sportType: { type: String, enum: ['cricket', 'badminton'], required: true },
    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, required: true, trim: true },
    ownerAddress: { type: String, required: true, trim: true },
    ownerLocation: { type: String, required: true, trim: true },
    address: String,
    city: String,
    description: String,
    /** Ground venue location — address text or map URL */
    location: { type: String, required: true, trim: true },
    /** At least 3 images — `/uploads/...` paths */
    imagePaths: {
      type: [String],
      required: true,
      validate: {
        validator(v) {
          return Array.isArray(v) && v.filter((p) => String(p).trim()).length >= 3;
        },
        message: 'At least 3 ground images are required',
      },
    },
    /** First image — kept for older clients */
    imagePath: { type: String, trim: true },
    lengthFeet: { type: Number, required: true, min: 1 },
    areaSqFt: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    slotDurationMinutes: { type: Number, default: 60 },
    openTime: { type: String, default: '08:00' },
    closeTime: { type: String, default: '22:00' },
    /** Hourly booking rate in PKR — used for search/filter */
    pricePerHour: { type: Number, default: 0, min: 0 },
    /** When listed by a business owner (optional — admin-listed grounds omit this) */
    businessOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    listedBy: { type: String, enum: ['admin', 'business_owner'], default: 'admin' },
  },
  { timestamps: true }
);

indoorGroundSchema.pre('validate', function syncPrimaryImage() {
  const paths = (this.imagePaths || []).map((p) => String(p).trim()).filter(Boolean);
  if (paths.length) this.imagePath = paths[0];
});

indoorGroundSchema.index({ sportType: 1, isActive: 1 });
indoorGroundSchema.index({ city: 1, pricePerHour: 1 });

module.exports = mongoose.model('IndoorGround', indoorGroundSchema);

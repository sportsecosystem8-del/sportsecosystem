const mongoose = require('mongoose');

const PACKAGE_LIMITS = { basic: 20, pro: 40, premium: 60 };
const FREE_TRIAL_LISTINGS = 10;

const businessProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    /** Business / store postal address (registration & verification) */
    address: { type: String, required: true, trim: true },
    phone: String,
    storeName: String,
    storeDescription: String,
    locationMapUrl: { type: String, required: true, trim: true },
    /** Set only after first paid subscription */
    subscriptionPackage: { type: String, enum: [null, 'basic', 'pro', 'premium'], default: null },
    /** One-time free listing pool for new businesses (not renewed monthly) */
    freeTrialListingsGranted: { type: Number, default: FREE_TRIAL_LISTINGS },
    listingSlotsRemaining: { type: Number, default: FREE_TRIAL_LISTINGS },
    subscriptionRenewsAt: Date,
    legalDocumentNote: String,
    /** Storefront branding & policies */
    storeLogoUrl: String,
    storeBannerUrl: String,
    shippingPolicyText: String,
    returnPolicyText: String,
    /** Easypaisa mobile account (03XXXXXXXXX) — receives ground & product payments */
    easypaisaMobile: { type: String, trim: true },
    easypaisaAccountTitle: { type: String, trim: true },
  },
  { timestamps: true }
);

businessProfileSchema.statics.packageLimit = function (pkg) {
  return PACKAGE_LIMITS[pkg] ?? PACKAGE_LIMITS.basic;
};

businessProfileSchema.methods.hasActiveSubscription = function hasActiveSubscription() {
  return !!(this.subscriptionPackage && this.subscriptionRenewsAt);
};

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);
module.exports.PACKAGE_LIMITS = PACKAGE_LIMITS;
module.exports.FREE_TRIAL_LISTINGS = FREE_TRIAL_LISTINGS;

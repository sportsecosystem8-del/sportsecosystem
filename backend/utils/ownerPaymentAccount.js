const BusinessProfile = require('../models/BusinessProfile');

/** Normalize Pakistani mobile to 03XXXXXXXXX */
function normalizeEasypaisaMobile(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length >= 12) digits = `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('3')) digits = `0${digits}`;
  if (!/^03\d{9}$/.test(digits)) return null;
  return digits;
}

async function getBusinessOwnerPaymentAccount(userId) {
  const bp = await BusinessProfile.findOne({ user: userId }).lean();
  const mobile = normalizeEasypaisaMobile(bp?.easypaisaMobile);
  if (!mobile) return null;
  return {
    mobile,
    accountTitle: (bp.easypaisaAccountTitle || bp.businessName || 'Merchant').trim(),
    businessName: bp.businessName,
  };
}

module.exports = {
  normalizeEasypaisaMobile,
  getBusinessOwnerPaymentAccount,
};

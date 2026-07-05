const SystemSettings = require('../models/SystemSettings');

const COACH_SUB_PRICE_KEY = 'coach_platform_subscription_usd';
const DEFAULT_COACH_SUB_USD = 10;

function coachPlatformSubscriptionActive(cp) {
  if (!cp || !cp.platformSubscriptionRenewsAt) return false;
  return new Date(cp.platformSubscriptionRenewsAt).getTime() > Date.now();
}

async function getCoachPlatformSubscriptionPriceUsd() {
  const row = await SystemSettings.findOne({ key: COACH_SUB_PRICE_KEY }).lean();
  const n = Number(row?.value);
  if (Number.isFinite(n) && n >= 0) return n;
  return DEFAULT_COACH_SUB_USD;
}

module.exports = {
  COACH_SUB_PRICE_KEY,
  DEFAULT_COACH_SUB_USD,
  coachPlatformSubscriptionActive,
  getCoachPlatformSubscriptionPriceUsd,
};

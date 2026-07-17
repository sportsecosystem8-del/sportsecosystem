const SystemSettings = require('../models/SystemSettings');

const COACH_SUB_PRICE_KEY_PKR = 'coach_platform_subscription_pkr';
/** Legacy key — values under 500 are treated as USD and converted. */
const COACH_SUB_PRICE_KEY_USD = 'coach_platform_subscription_usd';
const DEFAULT_COACH_SUB_PKR = 2800;
const DEFAULT_USD_TO_PKR = 280;

function usdToPkrRate() {
  const n = Number(process.env.USD_TO_PKR);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_USD_TO_PKR;
}

/** Convert a major-unit amount that may be legacy USD into PKR. */
function toPkrAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Legacy subscription charges were small USD figures (e.g. 10, 19, 99).
  if (n < 500) return Math.round(n * usdToPkrRate());
  return Math.round(n);
}

function coachPlatformSubscriptionActive(cp) {
  if (!cp || !cp.platformSubscriptionRenewsAt) return false;
  return new Date(cp.platformSubscriptionRenewsAt).getTime() > Date.now();
}

async function getCoachPlatformSubscriptionPricePkr() {
  const pkrRow = await SystemSettings.findOne({ key: COACH_SUB_PRICE_KEY_PKR }).lean();
  const pkr = Number(pkrRow?.value);
  if (Number.isFinite(pkr) && pkr >= 0) return pkr;

  const usdRow = await SystemSettings.findOne({ key: COACH_SUB_PRICE_KEY_USD }).lean();
  const usd = Number(usdRow?.value);
  if (Number.isFinite(usd) && usd >= 0) return toPkrAmount(usd);

  return DEFAULT_COACH_SUB_PKR;
}

/** @deprecated use getCoachPlatformSubscriptionPricePkr */
async function getCoachPlatformSubscriptionPriceUsd() {
  return getCoachPlatformSubscriptionPricePkr();
}

module.exports = {
  COACH_SUB_PRICE_KEY_PKR,
  COACH_SUB_PRICE_KEY_USD,
  COACH_SUB_PRICE_KEY: COACH_SUB_PRICE_KEY_PKR,
  DEFAULT_COACH_SUB_PKR,
  DEFAULT_COACH_SUB_USD: DEFAULT_COACH_SUB_PKR,
  usdToPkrRate,
  toPkrAmount,
  coachPlatformSubscriptionActive,
  getCoachPlatformSubscriptionPricePkr,
  getCoachPlatformSubscriptionPriceUsd,
};

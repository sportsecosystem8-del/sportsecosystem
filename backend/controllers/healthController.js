const mongoose = require('mongoose');
const { asyncHandler } = require('../utils/asyncHandler');
const { isMailerConfigured } = require('../utils/mailer');
const { isEasypaisaLive } = require('../utils/easypaisaPayments');
const { isStripeEnabled } = require('../utils/stripePayments');

const getHealth = asyncHandler(async (_req, res) => {
  let dbOk = false;
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    message: 'Sports Ecosystem API',
    status,
    checks: {
      database: dbOk ? 'connected' : 'unavailable',
      mailer: isMailerConfigured() ? 'configured' : 'missing_smtp',
      easypaisa: isEasypaisaLive() ? 'live' : 'demo',
      stripe: isStripeEnabled() ? 'enabled' : 'disabled',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = { getHealth };

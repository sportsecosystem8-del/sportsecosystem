const GroundBooking = require('../models/GroundBooking');

async function releaseExpiredHolds() {
  const now = new Date();
  await GroundBooking.updateMany(
    { status: 'held', holdExpiresAt: { $lt: now } },
    { $set: { status: 'cancelled' } }
  );
}

/**
 * True if interval [start, end] overlaps an active held/confirmed booking on same ground.
 */
async function hasOverlap(groundId, start, end, excludeId) {
  await releaseExpiredHolds();
  const now = new Date();
  const filter = {
    ground: groundId,
    startTime: { $lt: end },
    endTime: { $gt: start },
    $or: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { $gt: now } }],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const found = await GroundBooking.findOne(filter);
  return !!found;
}

module.exports = { releaseExpiredHolds, hasOverlap };

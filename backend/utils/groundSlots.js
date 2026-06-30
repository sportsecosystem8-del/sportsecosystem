const GroundBooking = require('../models/GroundBooking');
const { releaseExpiredHolds } = require('./groundBookings');

function parseTimeOnDate(dateInput, hhmm) {
  const base = new Date(dateInput);
  const [h, m] = String(hhmm || '08:00')
    .split(':')
    .map((n) => Number.parseInt(n, 10));
  const d = new Date(base);
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * @param {object} ground — IndoorGround lean doc
 * @param {string|Date} dateInput — calendar day
 * @param {Array<{startTime:Date,endTime:Date}>} bookings
 */
function generateDaySlots(ground, dateInput, bookings = []) {
  const duration = Math.max(15, Number(ground.slotDurationMinutes) || 60);
  const dayStart = parseTimeOnDate(dateInput, ground.openTime || '08:00');
  const dayEnd = parseTimeOnDate(dateInput, ground.closeTime || '22:00');
  const slots = [];
  let cursor = dayStart.getTime();
  const endMs = dayEnd.getTime();
  const durationMs = duration * 60 * 1000;

  while (cursor + durationMs <= endMs) {
    const startTime = new Date(cursor);
    const endTime = new Date(cursor + durationMs);
    const taken = bookings.some((b) =>
      intervalsOverlap(startTime, endTime, new Date(b.startTime), new Date(b.endTime))
    );
    slots.push({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      available: !taken,
      pricePerHour: ground.pricePerHour ?? 0,
      amount: ground.pricePerHour ? Math.round((duration / 60) * ground.pricePerHour) : 0,
    });
    cursor += durationMs;
  }
  return slots;
}

async function fetchActiveBookingsForGroundOnDay(groundId, dateInput) {
  await releaseExpiredHolds();
  const dayStart = parseTimeOnDate(dateInput, '00:00');
  const dayEnd = parseTimeOnDate(dateInput, '23:59');
  dayEnd.setSeconds(59, 999);
  return GroundBooking.find({
    ground: groundId,
    status: { $in: ['held', 'confirmed'] },
    startTime: { $lt: dayEnd },
    endTime: { $gt: dayStart },
  })
    .select('startTime endTime status')
    .lean();
}

async function slotsForGroundOnDay(ground, dateInput) {
  const bookings = await fetchActiveBookingsForGroundOnDay(ground._id, dateInput);
  return generateDaySlots(ground, dateInput, bookings);
}

function generateBookingToken() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GB-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

module.exports = {
  parseTimeOnDate,
  generateDaySlots,
  slotsForGroundOnDay,
  fetchActiveBookingsForGroundOnDay,
  generateBookingToken,
};

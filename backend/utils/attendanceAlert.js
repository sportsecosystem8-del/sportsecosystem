const AttendanceRecord = require('../models/AttendanceRecord');
const TrainingSession = require('../models/TrainingSession');
const Notification = require('../models/Notification');
const { notifyUser } = require('./notify');

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Alert when absences exceed half of recorded sessions in the current month.
 * Example: 20 sessions, 11+ absents → alert.
 */
async function evaluatePlayerAttendanceAlert(playerId) {
  const { start, end } = monthRange();
  const key = monthKey();

  const sessions = await TrainingSession.find({
    player: playerId,
    status: 'completed',
    scheduledAt: { $gte: start, $lt: end },
  })
    .select('_id')
    .lean();

  const total = sessions.length;
  if (total < 5) return null;

  const sessionIds = sessions.map((s) => s._id);
  const records = await AttendanceRecord.find({ session: { $in: sessionIds }, player: playerId })
    .select('present')
    .lean();

  const marked = records.length;
  if (marked < 5) return null;

  const absents = records.filter((r) => r.present === false).length;
  const threshold = Math.floor(total / 2);
  if (absents <= threshold) return null;

  const dedupeTitle = `Attendance alert — ${key}`;
  const existing = await Notification.findOne({
    user: playerId,
    category: 'attendance',
    title: dedupeTitle,
  }).lean();
  if (existing) return null;

  const body = `You were absent for ${absents} of ${total} completed sessions this month. Keep training consistent to stay on track.`;
  await notifyUser(playerId, { title: dedupeTitle, body, category: 'attendance' });
  return { absents, total, month: key };
}

module.exports = { evaluatePlayerAttendanceAlert, monthKey };

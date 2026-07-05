const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
const SPORTS = ['cricket', 'badminton'];

function toMinutesOfDay(timeText) {
  if (!timeText || typeof timeText !== 'string' || !timeText.includes(':')) return null;
  const [h, m] = timeText.split(':').map((n) => Number.parseInt(n, 10));
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function normalizeTimeText(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeScheduleSlots(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const dayOfWeek = Number.parseInt(row.dayOfWeek, 10);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
    const start = normalizeTimeText(row.start);
    const end = normalizeTimeText(row.end);
    if (!start || !end) continue;
    const startMin = toMinutesOfDay(start);
    const endMin = toMinutesOfDay(end);
    if (startMin == null || endMin == null || endMin <= startMin) continue;
    out.push({ dayOfWeek, start, end });
  }
  return out.slice(0, 21);
}

function validateScheduleSlots(raw) {
  const slots = normalizeScheduleSlots(raw);
  if (raw != null && !Array.isArray(raw)) {
    return { ok: false, message: 'Schedule must be an array of day/time slots.' };
  }
  if (Array.isArray(raw) && raw.length > 0 && slots.length === 0) {
    return { ok: false, message: 'Each slot needs a valid day, start time, and end time (end after start).' };
  }
  return { ok: true, slots };
}

function normalizeSkillLevels(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => String(v).trim().toLowerCase()).filter((v) => SKILL_LEVELS.includes(v)))];
}

function normalizeSports(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => String(v).trim().toLowerCase()).filter((v) => SPORTS.includes(v)))];
}

function slotsToMinuteRanges(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((s) => {
      const start = toMinutesOfDay(s?.start);
      const end = toMinutesOfDay(s?.end);
      if (start == null || end == null || typeof s?.dayOfWeek !== 'number') return null;
      return { dayOfWeek: s.dayOfWeek, start, end };
    })
    .filter(Boolean);
}

/** Collapse stored slots into selected weekdays + one shared time window */
function collapseSlotsToWeeklyPattern(slots) {
  const normalized = normalizeScheduleSlots(slots);
  if (!normalized.length) {
    return { days: [], start: '16:00', end: '18:00' };
  }
  const days = [...new Set(normalized.map((s) => s.dayOfWeek))].sort((a, b) => a - b);
  const start = normalized[0].start;
  const end = normalized[0].end;
  return { days, start, end };
}

/** Expand weekday checkboxes + shared time into schedule slot rows */
function expandWeeklyDaysTime({ days, start, end }) {
  if (!Array.isArray(days) || !days.length) return [];
  const s = normalizeTimeText(start);
  const e = normalizeTimeText(end);
  if (!s || !e) return [];
  const startMin = toMinutesOfDay(s);
  const endMin = toMinutesOfDay(e);
  if (startMin == null || endMin == null || endMin <= startMin) return [];
  const uniqueDays = [...new Set(days.map((d) => Number.parseInt(d, 10)).filter((d) => d >= 0 && d <= 6))];
  return uniqueDays.map((dayOfWeek) => ({ dayOfWeek, start: s, end: e }));
}

function uniqueDaysFromSlots(slots) {
  if (!Array.isArray(slots)) return new Set();
  return new Set(
    slots
      .map((s) => Number.parseInt(s?.dayOfWeek, 10))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
}

module.exports = {
  SKILL_LEVELS,
  SPORTS,
  toMinutesOfDay,
  normalizeScheduleSlots,
  validateScheduleSlots,
  normalizeSkillLevels,
  normalizeSports,
  slotsToMinuteRanges,
  collapseSlotsToWeeklyPattern,
  expandWeeklyDaysTime,
  uniqueDaysFromSlots,
};

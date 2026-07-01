import { useMemo } from 'react';
import { MultiCheckboxGroup, WEEKDAY_OPTIONS } from './WeeklyScheduleEditor';

function normalizeDays(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((d) => Number.parseInt(d, 10)).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
}

/** Parse stored schedule slots into weekday picks + one shared time range */
export function slotsToWeeklyPattern(slots) {
  if (!Array.isArray(slots) || !slots.length) {
    return { days: [], start: '16:00', end: '18:00' };
  }
  const days = normalizeDays(slots.map((s) => s.dayOfWeek));
  const start = String(slots[0]?.start || '16:00').slice(0, 5);
  const end = String(slots[0]?.end || '18:00').slice(0, 5);
  return { days, start, end };
}

/** Build schedule slot rows from weekday picks + shared time */
export function weeklyPatternToSlots({ days, start, end }) {
  const picked = normalizeDays(days);
  if (!picked.length || !start || !end) return [];
  return picked.map((dayOfWeek) => ({
    dayOfWeek,
    start: String(start).slice(0, 5),
    end: String(end).slice(0, 5),
  }));
}

/**
 * Pick weekdays + one time window — stored as multiple slots with the same start/end.
 * Used for coach availability and player training preferences (recommendation matching only).
 */
export default function WeeklyDaysTimeEditor({
  slots,
  onChange,
  fieldClass,
  accentClass = 'text-player-green',
  emptyHint = 'Select the days you are available and set your usual training time.',
}) {
  const pattern = useMemo(() => slotsToWeeklyPattern(slots), [slots]);

  const setDays = (days) => {
    onChange(weeklyPatternToSlots({ days, start: pattern.start, end: pattern.end }));
  };

  const setStart = (start) => {
    onChange(weeklyPatternToSlots({ days: pattern.days, start, end: pattern.end }));
  };

  const setEnd = (end) => {
    onChange(weeklyPatternToSlots({ days: pattern.days, start: pattern.start, end }));
  };

  return (
    <div className="space-y-4">
      {pattern.days.length === 0 ? <p className="text-xs text-player-on-variant">{emptyHint}</p> : null}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Training days</p>
        <MultiCheckboxGroup
          options={WEEKDAY_OPTIONS}
          values={pattern.days}
          onChange={setDays}
          accentClass={accentClass}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">From</label>
          <input
            type="time"
            className={fieldClass}
            value={pattern.start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">To</label>
          <input
            type="time"
            className={fieldClass}
            value={pattern.end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      {pattern.days.length > 0 ? (
        <p className="text-xs text-slate-500">
          {pattern.days.length} day{pattern.days.length === 1 ? '' : 's'} · {pattern.start}–{pattern.end} each week
        </p>
      ) : null}
    </div>
  );
}

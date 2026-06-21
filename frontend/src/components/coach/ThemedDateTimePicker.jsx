import { useEffect, useMemo, useState } from 'react';
import { coachField } from './coachClassNames';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toLocalDateTimeValue(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseLocalDateTimeValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function to12Hour(hours24) {
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, meridiem };
}

function to24Hour(hour12, meridiem) {
  if (meridiem === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function partsFromValue(value) {
  const d = parseLocalDateTimeValue(value);
  if (!d) return { date: '', hour12: 9, minute: 0, meridiem: 'AM' };
  const { hour12, meridiem } = to12Hour(d.getHours());
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    hour12,
    minute: d.getMinutes(),
    meridiem,
  };
}

function valueFromParts(date, hour12, minute, meridiem) {
  if (!date) return '';
  const [y, m, day] = date.split('-').map(Number);
  const hours24 = to24Hour(Number(hour12), meridiem);
  const d = new Date(y, m - 1, day, hours24, Number(minute), 0, 0);
  return toLocalDateTimeValue(d);
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const selectClass = `${coachField} py-2`;

/** Date + 12-hour time with clear AM/PM — no popup calendar. */
export default function ThemedDateTimePicker({ value, onChange, className = '' }) {
  const [parts, setParts] = useState(() => partsFromValue(value));

  useEffect(() => {
    setParts(partsFromValue(value));
  }, [value]);

  const update = (patch) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(valueFromParts(next.date, next.hour12, next.minute, next.meridiem));
  };

  const summary = useMemo(() => {
    const iso = valueFromParts(parts.date, parts.hour12, parts.minute, parts.meridiem);
    const d = parseLocalDateTimeValue(iso);
    if (!d) return null;
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [parts]);

  const fieldSelect = (label, id, fieldValue, options, onFieldChange) => (
    <label className="block min-w-0 flex-1">
      <span className="mb-1 block font-headline text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select id={id} className={selectClass} value={fieldValue} onChange={(e) => onFieldChange(e.target.value)}>
        {options}
      </select>
    </label>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block">
        <span className="mb-1 block font-headline text-[10px] uppercase tracking-[0.16em] text-slate-500">Date</span>
        <input
          type="date"
          className={coachField}
          value={parts.date}
          onChange={(e) => update({ date: e.target.value })}
        />
      </label>

      <div>
        <span className="mb-1 block font-headline text-[10px] uppercase tracking-[0.16em] text-slate-500">Time</span>
        <div className="flex flex-wrap items-end gap-2">
          {fieldSelect(
            'Hour',
            'session-hour',
            parts.hour12,
            HOURS_12.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            )),
            (v) => update({ hour12: Number(v) }),
          )}
          {fieldSelect(
            'Minute',
            'session-minute',
            parts.minute,
            MINUTES.map((m) => (
              <option key={m} value={m}>
                {pad2(m)}
              </option>
            )),
            (v) => update({ minute: Number(v) }),
          )}
          <div className="min-w-[7rem] flex-1">
            <span className="mb-1 block font-headline text-[10px] uppercase tracking-[0.16em] text-slate-500">AM / PM</span>
            <div className="grid grid-cols-2 gap-1 rounded-player-nested border border-white/[0.06] bg-player-bg p-1">
              {['AM', 'PM'].map((m) => {
                const active = parts.meridiem === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update({ meridiem: m })}
                    className={`rounded-md py-2 font-headline text-xs font-bold uppercase tracking-wider transition ${
                      active ? 'bg-[#ff7524] text-black shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {summary ? (
        <p className="rounded-lg border border-[#ff7524]/25 bg-[#ff7524]/5 px-3 py-2 text-sm text-slate-200">
          <span className="font-headline text-[10px] uppercase tracking-wider text-[#ff7524]">Scheduled for </span>
          <span className="font-medium text-white">{summary}</span>
        </p>
      ) : (
        <p className="text-xs text-slate-500">Pick a date, then choose hour, minute, and AM or PM.</p>
      )}
    </div>
  );
}

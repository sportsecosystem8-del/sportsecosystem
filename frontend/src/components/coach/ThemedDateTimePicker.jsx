import { useEffect, useId, useMemo, useRef, useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

function calendarCells(viewMonth) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= total; day += 1) cells.push(new Date(year, month, day));
  return cells;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function mergeDateAndTime(datePart, timeSource) {
  const next = new Date(datePart);
  const hours = timeSource?.getHours() ?? 9;
  const minutes = timeSource?.getMinutes() ?? 0;
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export default function ThemedDateTimePicker({ value, onChange, className = '', placeholder = 'Pick date & time' }) {
  const rootRef = useRef(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateTimeValue(value);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());

  useEffect(() => {
    if (selected) setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);
  const hours = selected?.getHours() ?? 9;
  const minutes = selected?.getMinutes() ?? 0;

  const setDatePart = (datePart) => {
    onChange(toLocalDateTimeValue(mergeDateAndTime(datePart, selected || new Date())));
  };

  const setTimePart = (nextHours, nextMinutes) => {
    const base = selected || new Date();
    const next = new Date(base);
    next.setHours(nextHours, nextMinutes, 0, 0);
    onChange(toLocalDateTimeValue(next));
  };

  const display = selected
    ? selected.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={listId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b-2 border-player-inner bg-player-bg px-3 py-2.5 text-left text-sm text-white outline-none transition focus:border-[#ff7524]"
      >
        <span className={display ? 'text-white' : 'text-slate-500'}>{display || placeholder}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#ff7524]/30 bg-[#ff7524]/10 text-[#ff7524]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-labelledby={listId}
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-white/10 bg-player-container shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-white/10 bg-player-bg/80 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
                onClick={() =>
                  setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                }
                aria-label="Previous month"
              >
                ‹
              </button>
              <p className="font-headline text-xs uppercase tracking-[0.16em] text-white">
                {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
                onClick={() =>
                  setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                }
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="py-1 text-center font-headline text-[10px] uppercase tracking-wider text-slate-500"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <span key={`empty-${idx}`} />;
                const isSelected = sameDay(day, selected);
                const isToday = sameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setDatePart(day)}
                    className={`h-9 rounded-lg text-sm transition ${
                      isSelected
                        ? 'bg-[#ff7524] font-semibold text-black'
                        : isToday
                          ? 'border border-[#ff7524]/40 text-[#ff7524] hover:bg-[#ff7524]/10'
                          : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 bg-player-bg/60 px-4 py-3">
            <p className="mb-2 font-headline text-[10px] uppercase tracking-[0.18em] text-slate-500">Time</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="sr-only">Hour</span>
                <select
                  value={hours}
                  onChange={(e) => setTimePart(Number(e.target.value), minutes)}
                  className="w-full rounded-lg border border-white/10 bg-player-inner px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {pad2(h)} h
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Minute</span>
                <select
                  value={minutes}
                  onChange={(e) => setTimePart(hours, Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-player-inner px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      :{pad2(m)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs uppercase tracking-wider text-slate-400 hover:text-white"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#ff7524] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:brightness-110"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

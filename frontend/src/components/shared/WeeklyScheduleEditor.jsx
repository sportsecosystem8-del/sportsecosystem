export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export const SPORT_OPTIONS = [
  { value: 'cricket', label: 'Cricket' },
  { value: 'football', label: 'Football' },
  { value: 'badminton', label: 'Badminton' },
];

export const SKILL_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function emptySlot() {
  return { dayOfWeek: 1, start: '16:00', end: '18:00' };
}

export function normalizeSlots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      dayOfWeek: Number.isInteger(row?.dayOfWeek) ? row.dayOfWeek : Number.parseInt(row?.dayOfWeek, 10),
      start: String(row?.start || '').slice(0, 5),
      end: String(row?.end || '').slice(0, 5),
    }))
    .filter((row) => Number.isInteger(row.dayOfWeek) && row.dayOfWeek >= 0 && row.dayOfWeek <= 6 && row.start && row.end);
}

export default function WeeklyScheduleEditor({
  slots,
  onChange,
  fieldClass,
  addButtonClass,
  emptyHint = 'Add the days and times you prefer for training.',
}) {
  const rows = normalizeSlots(slots);

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...rows, emptySlot()]);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-xs text-player-on-variant">{emptyHint}</p>
      ) : null}
      {rows.map((row, index) => (
        <div key={`slot-${index}`} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
          <select
            className={fieldClass}
            value={row.dayOfWeek}
            onChange={(e) => updateRow(index, { dayOfWeek: Number.parseInt(e.target.value, 10) })}
          >
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            type="time"
            className={fieldClass}
            value={row.start}
            onChange={(e) => updateRow(index, { start: e.target.value })}
          />
          <input
            type="time"
            className={fieldClass}
            value={row.end}
            onChange={(e) => updateRow(index, { end: e.target.value })}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-300 transition hover:border-red-400/40 hover:bg-red-950/30"
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className={addButtonClass}>
        + Add time slot
      </button>
    </div>
  );
}

export function MultiCheckboxGroup({ options, values, onChange, accentClass = 'text-player-green' }) {
  const selected = Array.isArray(values) ? values : [];
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              checked
                ? `border-current bg-white/5 ${accentClass}`
                : 'border-white/15 text-player-on-variant hover:border-white/30'
            }`}
          >
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(opt.value)} />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

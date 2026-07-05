import { useMemo, useState } from 'react';
import CoachSearchField from './CoachSearchField';
import PlayerAvatar from '../PlayerAvatar';

import { matchesStudentQuery } from '../../utils/coachStudents';

function StudentMetaTag({ children }) {
  return (
    <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-label text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

/** Card list for choosing a student — clear when names repeat. */
export default function CoachStudentPicker({
  students,
  value,
  onChange,
  loading = false,
  emptyContent = null,
  className = '',
  id,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => students.filter((s) => matchesStudentQuery(s, query)),
    [students, query],
  );

  if (loading) {
    return <p className="mt-2 text-xs text-slate-500">Loading students…</p>;
  }

  if (!students.length) {
    return emptyContent ? <div className="mt-2">{emptyContent}</div> : null;
  }

  const showSearch = students.length > 1;

  return (
    <div className={`mt-2 space-y-3 ${className}`}>
      {showSearch ? (
        <div className="space-y-2">
          <CoachSearchField
            value={query}
            onChange={setQuery}
            placeholder="Search by name, roll #, email, city, or sport…"
            aria-label="Search students"
          />
          <p className="font-label text-[10px] uppercase tracking-wider text-slate-500">
            {filtered.length} of {students.length} student{students.length === 1 ? '' : 's'}
            {query.trim() ? ' matching' : ''}
          </p>
        </div>
      ) : null}

      <div
        id={id}
        role="listbox"
        aria-label="Select student"
        className="max-h-64 space-y-2 overflow-y-auto pr-1 admin-scrollbar"
      >
        {filtered.map((s) => {
          const selected = value === s.playerId;
          return (
            <button
              key={s.playerId}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(s.playerId)}
              className={`flex w-full items-center gap-3 rounded-player-nested border px-3 py-3 text-left transition-all ${
                selected
                  ? 'border-[#ff7524] bg-[#ff7524]/10 shadow-[0_0_16px_rgba(255,117,36,0.12)]'
                  : 'border-white/[0.06] bg-player-bg hover:border-white/20 hover:bg-white/[0.03]'
              }`}
            >
              <PlayerAvatar
                profile={{
                  fullName: s.fullName,
                  profilePhotoUrl: s.profilePhotoUrl,
                  updatedAt: s.updatedAt,
                }}
                size="md"
                className={selected ? 'ring-2 ring-[#ff7524] ring-offset-2 ring-offset-player-bg' : ''}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{s.fullName}</p>
                  {s.coachRollNo ? (
                    <span className="shrink-0 rounded bg-[#ff7524]/20 px-2 py-0.5 font-orbitron text-[10px] font-bold uppercase tracking-wider text-[#ff7524]">
                      #{s.coachRollNo}
                    </span>
                  ) : null}
                </div>
                {s.city || s.sportPreference ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.city ? <StudentMetaTag>{s.city}</StudentMetaTag> : null}
                    {s.sportPreference ? <StudentMetaTag>{s.sportPreference}</StudentMetaTag> : null}
                  </div>
                ) : null}
                {s.email ? <p className="mt-1 truncate font-label text-xs text-slate-500">{s.email}</p> : null}
              </div>
              {selected ? (
                <span className="material-symbols-outlined shrink-0 text-xl text-[#ff7524]" aria-hidden>
                  check_circle
                </span>
              ) : (
                <span className="material-symbols-outlined shrink-0 text-xl text-slate-600" aria-hidden>
                  radio_button_unchecked
                </span>
              )}
            </button>
          );
        })}
        {!filtered.length ? (
          <p className="rounded-player-nested border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
            No students match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : null}
      </div>
    </div>
  );
}

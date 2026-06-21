import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CoachSearchField from '../../components/coach/CoachSearchField';
import PlayerAvatar from '../../components/PlayerAvatar';
import { api, getErrorMessage } from '../../services/api';
import { matchesStudentQuery } from '../../utils/coachStudents';

function StudentCard({ student, evalScore }) {
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-white/10 bg-player-bg/80 p-4 transition-colors hover:border-[#ff7524]/40 sm:flex-row sm:items-start">
      <PlayerAvatar
        profile={{ profilePhotoUrl: student.profilePhotoUrl, updatedAt: student.profileUpdatedAt }}
        name={student.fullName}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-display text-xl tracking-wide text-white">{student.fullName}</p>
            {student.email ? <p className="mt-0.5 text-xs text-slate-400">{student.email}</p> : null}
          </div>
          {evalScore != null ? (
            <span className="rounded bg-player-green/15 px-2 py-0.5 font-orbitron text-xs text-player-green">
              {evalScore}% avg
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {student.sportPreference ? (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {student.sportPreference}
            </span>
          ) : null}
          {student.city ? (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {student.city}
            </span>
          ) : null}
          {student.skillLevel ? (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {student.skillLevel}
            </span>
          ) : null}
        </div>
        {student.nextSessionAt ? (
          <p className="mt-3 text-xs text-player-green">
            Next session:{' '}
            {new Date(student.nextSessionAt).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No upcoming session scheduled</p>
        )}
        {student.acceptedAt ? (
          <p className="mt-1 text-[10px] text-slate-600">
            Roster since {new Date(student.acceptedAt).toLocaleDateString()}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/coach/sessions"
            className="rounded border border-[#ff7524]/40 px-2.5 py-1 font-headline text-[10px] uppercase tracking-wider text-[#ff7524] hover:bg-[#ff7524]/10"
          >
            Schedule
          </Link>
          <Link
            to="/coach/performance"
            className="rounded border border-white/10 px-2.5 py-1 font-headline text-[10px] uppercase tracking-wider text-slate-400 hover:text-white"
          >
            Evaluate
          </Link>
          <Link
            to="/coach/plans"
            className="rounded border border-white/10 px-2.5 py-1 font-headline text-[10px] uppercase tracking-wider text-slate-400 hover:text-white"
          >
            Weekly plan
          </Link>
          <Link
            to="/coach/attendance"
            className="rounded border border-white/10 px-2.5 py-1 font-headline text-[10px] uppercase tracking-wider text-slate-400 hover:text-white"
          >
            Attendance
          </Link>
        </div>
      </div>
    </li>
  );
}

export default function CoachStudents() {
  const [students, setStudents] = useState([]);
  const [evalByPlayer, setEvalByPlayer] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/coaches/dashboard')
      .then((r) => {
        const data = r.data.data || {};
        setStudents(data.myStudents || []);
        const scores = {};
        for (const p of data.topPerformers || []) {
          scores[p.playerId] = p.score;
        }
        setEvalByPlayer(scores);
      })
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => students.filter((s) => matchesStudentQuery(s, query)).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, query],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white">MY STUDENTS</h1>
          <p className="font-headline text-xs uppercase tracking-[0.28em] text-[#ff7524]">
            Accepted roster · sessions & evaluations
          </p>
        </div>
        <Link
          to="/coach/requests"
          className="inline-flex items-center gap-2 border border-[#ff7524]/40 px-4 py-2 font-headline text-xs uppercase tracking-[0.16em] text-[#ff7524] transition hover:bg-[#ff7524]/10"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          View requests
        </Link>
      </div>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <div className="midnight-asymmetric border border-player-inner/40 bg-player-container p-4 shadow-player-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-orbitron text-2xl text-white">
            {loading ? '…' : students.length}
            <span className="ml-2 font-headline text-xs uppercase tracking-wider text-slate-500">active students</span>
          </p>
          {students.length > 1 ? (
            <CoachSearchField
              value={query}
              onChange={setQuery}
              placeholder="Search name, email, city, sport…"
              className="w-full sm:max-w-sm"
              aria-label="Search students"
            />
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="font-headline text-xs uppercase tracking-[0.2em] text-slate-500">Loading roster…</p>
      ) : filtered.length ? (
        <>
          {query.trim() ? (
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Showing {filtered.length} of {students.length}
            </p>
          ) : null}
          <ul className="grid gap-4 lg:grid-cols-2">
            {filtered.map((s) => (
              <StudentCard key={s.playerId} student={s} evalScore={evalByPlayer[s.playerId]} />
            ))}
          </ul>
        </>
      ) : students.length ? (
        <p className="text-sm text-slate-400">No students match your search.</p>
      ) : (
        <div className="midnight-asymmetric border border-player-inner/40 bg-player-container p-8 text-center shadow-player-card">
          <span className="material-symbols-outlined text-4xl text-slate-600">groups</span>
          <p className="mt-3 font-headline text-sm uppercase tracking-[0.14em] text-slate-400">No students yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Accept a training request from{' '}
            <Link to="/coach/requests" className="text-[#ff7524] hover:underline">
              Requests
            </Link>{' '}
            to build your roster.
          </p>
        </div>
      )}
    </div>
  );
}

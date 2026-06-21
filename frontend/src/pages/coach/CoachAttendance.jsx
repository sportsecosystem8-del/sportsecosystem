import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CoachSearchField from '../../components/coach/CoachSearchField';
import PlayerAvatar from '../../components/PlayerAvatar';
import { sessionWindow } from '../../components/player/PlayerSessionCard';
import { api, getErrorMessage } from '../../services/api';

function playerFromRecord(record) {
  const profile = record.player?.playerProfile;
  return {
    fullName: profile?.fullName || record.player?.email || 'Player',
    email: record.player?.email || '',
    city: profile?.city || '',
    sportPreference: profile?.sportPreference || '',
    skillLevel: profile?.skillLevel || '',
    phone: profile?.phone || '',
    profile,
  };
}

function matchesAttendanceQuery(record, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const p = playerFromRecord(record);
  const session = record.session;
  const hay = [
    p.fullName,
    p.email,
    p.city,
    p.sportPreference,
    p.skillLevel,
    p.phone,
    session?.location,
    record.present ? 'present' : 'absent',
    record.notes,
    session?.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : '',
    record.createdAt ? new Date(record.createdAt).toLocaleString() : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function formatMarkedAt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AttendanceRow({ record }) {
  const player = playerFromRecord(record);
  const window = record.session?.scheduledAt ? sessionWindow(record.session.scheduledAt) : null;
  const present = record.present === true;

  return (
    <li
      className={`midnight-asymmetric border bg-player-container p-4 shadow-player-card transition hover:bg-player-surface ${
        present ? 'border-player-green/25' : 'border-red-500/20'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <PlayerAvatar profile={player.profile} name={player.fullName} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-display text-2xl tracking-[0.06em] text-white">{player.fullName}</p>
              <p className="mt-0.5 text-xs text-slate-400">{player.email}</p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-2.5 py-1 text-[10px] font-orbitron uppercase tracking-wider ${
                present ? 'bg-player-green/15 text-player-green' : 'bg-red-500/15 text-red-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{present ? 'check_circle' : 'cancel'}</span>
              {present ? 'Present' : 'Absent'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {player.city ? (
              <span className="rounded-sm bg-player-inner px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {player.city}
              </span>
            ) : null}
            {player.sportPreference ? (
              <span className="rounded-sm bg-player-inner px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {player.sportPreference}
              </span>
            ) : null}
            {player.skillLevel ? (
              <span className="rounded-sm bg-player-inner px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {player.skillLevel}
              </span>
            ) : null}
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-headline uppercase tracking-[0.18em] text-slate-500">Session date</dt>
              <dd className="mt-1 text-slate-200">
                {window ? (
                  <>
                    {window.start.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {window.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} –{' '}
                      {window.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · 90 min
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-headline uppercase tracking-[0.18em] text-slate-500">Location</dt>
              <dd className="mt-1 text-slate-200">{record.session?.location?.trim() || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-headline uppercase tracking-[0.18em] text-slate-500">Marked on</dt>
              <dd className="mt-1 text-slate-200">{formatMarkedAt(record.updatedAt || record.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-headline uppercase tracking-[0.18em] text-slate-500">Session status</dt>
              <dd className="mt-1 capitalize text-slate-200">{record.session?.status || 'completed'}</dd>
            </div>
          </dl>

          {record.notes ? (
            <p className="mt-3 rounded border border-player-inner/60 bg-player-bg/60 px-3 py-2 text-xs italic text-slate-400">
              Notes: {record.notes}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function CoachAttendance() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get('/coaches/attendance');
      setList(data.data || []);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const present = list.filter((r) => r.present === true).length;
    const absent = list.filter((r) => r.present === false).length;
    const total = list.length;
    const rate = total ? Math.round((present / total) * 100) : null;
    return { present, absent, total, rate };
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((record) => {
      if (statusFilter === 'present' && record.present !== true) return false;
      if (statusFilter === 'absent' && record.present !== false) return false;
      return matchesAttendanceQuery(record, query);
    });
  }, [list, query, statusFilter]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'present', label: 'Present' },
    { id: 'absent', label: 'Absent' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white">ATTENDANCE</h1>
          <p className="font-headline text-xs uppercase tracking-[0.28em] text-[#ff7524]">Session records · all students</p>
        </div>
        <Link
          to="/coach/sessions"
          className="inline-flex items-center gap-2 border border-[#ff7524]/40 px-4 py-2 font-headline text-xs uppercase tracking-[0.16em] text-[#ff7524] transition hover:bg-[#ff7524]/10"
        >
          <span className="material-symbols-outlined text-base">calendar_month</span>
          Mark on schedule
        </Link>
      </div>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total records" value={stats.total} />
        <StatCard label="Present" value={stats.present} accent="green" />
        <StatCard label="Absent" value={stats.absent} accent="red" />
        <StatCard label="Attendance rate" value={stats.rate != null ? `${stats.rate}%` : '—'} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CoachSearchField
          value={query}
          onChange={setQuery}
          placeholder="Search student, city, sport, location, date…"
          className="w-full sm:max-w-md"
          aria-label="Search attendance records"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 font-headline text-[10px] uppercase tracking-[0.16em] transition ${
                statusFilter === f.id
                  ? 'bg-[#ff7524] text-black'
                  : 'border border-player-inner text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="font-headline text-xs uppercase tracking-[0.2em] text-slate-500">Loading attendance…</p>
      ) : filtered.length === 0 ? (
        <div className="midnight-asymmetric border border-player-inner/40 bg-player-container p-8 text-center shadow-player-card">
          <span className="material-symbols-outlined text-4xl text-slate-600">fact_check</span>
          <p className="mt-3 font-headline text-sm uppercase tracking-[0.14em] text-slate-400">
            {list.length === 0 ? 'No attendance marked yet' : 'No records match your search'}
          </p>
          {list.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Go to{' '}
              <Link to="/coach/sessions" className="text-[#ff7524] hover:underline">
                Weekly Schedule
              </Link>{' '}
              and mark Present or Absent on a past session.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Showing {filtered.length} of {list.length} record{list.length === 1 ? '' : 's'}
          </p>
          <ul className="grid gap-4">
            {filtered.map((record) => (
              <AttendanceRow key={record._id} record={record} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const valueCls =
    accent === 'green'
      ? 'text-player-green'
      : accent === 'red'
        ? 'text-red-300'
        : 'text-white';
  return (
    <div className="midnight-asymmetric border border-player-inner/40 bg-player-container px-4 py-3 shadow-player-card">
      <p className="text-[10px] font-headline uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-3xl tracking-[0.06em] ${valueCls}`}>{value}</p>
    </div>
  );
}

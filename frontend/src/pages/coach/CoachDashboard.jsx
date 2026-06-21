import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CoachAvatar from '../../components/CoachAvatar';
import { api, getErrorMessage } from '../../services/api';

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function CoachDashboard() {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/coaches/dashboard'),
      api.get('/coaches/notifications'),
      api.get('/coaches/me/profile'),
    ])
      .then(([dash, notif, prof]) => {
        setStats(dash.data.data);
        const ver = (notif.data.data || []).filter((n) => n.category === 'verification').slice(0, 5);
        setVerificationNotes(ver);
        setProfile(prof.data.data);
      })
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const chart = stats?.weeklyChart || [];
  const topPerformers = stats?.topPerformers || [];
  const maxBar = Math.max(...chart.map((d) => d.heightPercent), 1);
  const highlightIdx = chart.reduce((best, d, i) => (d.count > (chart[best]?.count ?? -1) ? i : best), 0);

  return (
    <div className="space-y-8 text-player-on-surface">
      <section className="midnight-asymmetric relative overflow-hidden bg-gradient-to-r from-[#a04100] to-[#ff7524] px-6 py-8 shadow-player-hero md:px-10">
        <div className="landing-pitch-lines absolute inset-0 opacity-20" />
        <div className="absolute -right-10 -top-6 text-[180px] text-white/10">
          <span className="material-symbols-outlined">sports_cricket</span>
        </div>
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CoachAvatar profile={profile} size="xl" className="ring-2 ring-white/30" />
            <div>
              <h1 className="font-display text-4xl tracking-tight text-white md:text-6xl">
                {profile?.fullName ? `HI, ${profile.fullName.split(/\s+/)[0].toUpperCase()}` : 'WELCOME BACK, COACH'}
              </h1>
              <p className="mt-2 font-headline text-sm uppercase tracking-[0.18em] text-white/85">Elite Performance Command Center</p>
              <Link to="/coach/profile" className="mt-2 inline-block text-xs font-bold uppercase tracking-wider text-white/90 underline-offset-2 hover:underline">
                Edit profile & photo
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/coach/requests" className="bg-white px-6 py-3 font-display text-xl tracking-[0.14em] text-[#a04100] transition hover:brightness-95">
              VIEW REQUESTS
            </Link>
            <Link to="/coach/sessions" className="border-2 border-white px-6 py-3 font-display text-xl tracking-[0.14em] text-white transition hover:bg-white/10">
              OPEN SCHEDULE
            </Link>
            <Link to="/coach/notifications" className="border-2 border-white/60 px-6 py-3 font-display text-xl tracking-[0.14em] text-white/90 transition hover:bg-white/10">
              NOTIFICATIONS
            </Link>
          </div>
        </div>
      </section>

      {err && <p className="text-sm text-red-400">{err}</p>}

      {verificationNotes.length > 0 ? (
        <section className="midnight-asymmetric border border-[#ff7524]/40 bg-player-container p-5 shadow-player-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline text-sm font-bold uppercase tracking-[0.12em] text-[#ff7524]">
              Verification updates
            </h2>
            <Link
              to="/coach/notifications"
              className="font-headline text-xs uppercase tracking-widest text-white/80 underline-offset-4 hover:underline"
            >
              All notifications
            </Link>
          </div>
          <ul className="space-y-3">
            {verificationNotes.map((n) => (
              <li key={n._id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-white">{n.title}</p>
                {n.body ? <p className="mt-1 text-xs text-slate-400">{n.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="midnight-asymmetric border-l-4 border-[#ff7524] bg-player-container p-5 shadow-player-card">
          <p className="font-headline text-xs uppercase tracking-[0.16em] text-player-on-variant">Pending Requests</p>
          <p className="mt-2 font-orbitron text-3xl font-bold text-white">
            {loading ? '…' : (stats?.pendingRequests ?? 0)}
          </p>
        </div>
        <div className="midnight-asymmetric border-l-4 border-player-green bg-player-container p-5 shadow-player-card">
          <p className="font-headline text-xs uppercase tracking-[0.16em] text-player-on-variant">Total Received</p>
          <p className="mt-2 font-orbitron text-3xl font-bold text-white">
            {loading ? '…' : `$${formatMoney(stats?.totalReceived)}`}
          </p>
        </div>
        <div className="midnight-asymmetric border-l-4 border-violet-400 bg-player-container p-5 shadow-player-card">
          <p className="font-headline text-xs uppercase tracking-[0.16em] text-player-on-variant">Session Readiness</p>
          <p className="mt-2 font-orbitron text-3xl font-bold text-white">
            {loading ? '…' : stats?.sessionReadiness != null ? `${stats.sessionReadiness}%` : '—'}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Attendance marked for past sessions (30 days)</p>
        </div>
        <div className="midnight-asymmetric border-l-4 border-cyan-400 bg-player-container p-5 shadow-player-card">
          <p className="font-headline text-xs uppercase tracking-[0.16em] text-player-on-variant">Weekly Volume</p>
          <p className="mt-2 font-orbitron text-3xl font-bold text-white">
            {loading ? '…' : (stats?.weeklyVolume ?? 0)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Sessions in the last 7 days</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="midnight-asymmetric lg:col-span-2 bg-player-container p-6 shadow-player-card">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl font-bold uppercase tracking-[0.08em] text-white">Weekly Session Volume</h2>
            <span className="rounded bg-player-inner px-3 py-1 font-headline text-xs uppercase tracking-widest text-player-on-variant">Last 7 days</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading chart…</p>
          ) : chart.length ? (
            <div className="flex h-56 items-end gap-2">
              {chart.map((day, idx) => {
                const height = maxBar > 0 ? Math.max(day.heightPercent, day.count > 0 ? 8 : 4) : 4;
                const active = idx === highlightIdx && day.count > 0;
                return (
                  <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="font-orbitron text-[10px] text-slate-500">{day.count}</span>
                    <div
                      className={`w-full rounded-t-sm ${active ? 'bg-[#ff7524]' : 'bg-[#ff7524]/25'}`}
                      style={{ height: `${height}%` }}
                      title={`${day.count} session(s)`}
                    />
                    <span className={`font-headline text-[10px] uppercase ${active ? 'text-[#ff7524]' : 'text-slate-500'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No sessions scheduled in the last 7 days.</p>
          )}
        </div>
        <div className="midnight-asymmetric bg-player-container p-6 shadow-player-card">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-headline text-xl font-bold uppercase tracking-[0.08em] text-white">Top Performers</h2>
            <Link to="/coach/performance" className="font-headline text-[10px] uppercase tracking-widest text-[#ff7524] hover:underline">
              Add scores
            </Link>
          </div>
          <p className="mb-4 text-[10px] text-slate-500">Latest weekly evaluation average per player</p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : topPerformers.length ? (
            <ul className="space-y-4">
              {topPerformers.map((p) => (
                <li key={p.playerId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{p.name}</span>
                    <span className="font-orbitron text-xs text-player-green">{p.scoreLabel}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-player-bg">
                    <div className="h-full rounded-full bg-player-green" style={{ width: `${p.score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No performance scores yet. Add weekly evaluations from the Evaluations page.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

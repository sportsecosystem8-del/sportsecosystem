import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerIcon from '../../components/player/PlayerIcon';
import SkillArcRow from '../../components/player/SkillArcRow';
import { playerBadgeLive, playerHeroBtnPrimary, playerHeroBtnSecondary } from '../../components/player/playerClassNames';
import CoachAvatar from '../../components/CoachAvatar';
import CoachLocationLines from '../../components/player/CoachLocationLines';
import { playerLocationOrigin } from '../../utils/coachLocation';
import { api, getErrorMessage } from '../../services/api';
import { evalOverallScore } from '../../utils/evaluationDisplay';

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatPts(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat().format(Math.round(n));
}

function coachName(s) {
  return s?.coach?.coachProfile?.fullName || s?.coach?.email || 'Coach';
}

function relativeTime(d) {
  if (!d) return '';
  const t = new Date(d).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function activityBadge(category) {
  const c = (category || 'update').toLowerCase();
  if (c.includes('order') || c.includes('payment')) return 'bg-player-cyan/20 text-player-cyan';
  if (c.includes('coach') || c.includes('message')) return 'bg-player-violet/20 text-player-violet';
  if (c.includes('session') || c.includes('training')) return 'bg-player-green/20 text-player-green';
  return 'bg-white/10 text-white';
}

export default function PlayerDashboard() {
  const [me, setMe] = useState(null);
  const [sessionList, setSessionList] = useState([]);
  const [perfList, setPerfList] = useState([]);
  const [notifList, setNotifList] = useState([]);
  const [coaches, setCoaches] = useState(0);
  const [trainingRequests, setTrainingRequests] = useState([]);
  const [orders, setOrders] = useState(0);
  const [playerOrigin, setPlayerOrigin] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr('');
      try {
        const [meRes, n, r, s, o, p, tr, profileRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/players/notifications'),
          api.get('/players/recommendations'),
          api.get('/players/training-sessions'),
          api.get('/players/orders'),
          api.get('/players/performance'),
          api.get('/players/training-requests'),
          api.get('/players/me/profile').catch(() => ({ data: { data: null } })),
        ]);
        if (cancelled) return;
        setMe(meRes.data.data);
        setNotifList(n.data.data || []);
        setCoaches(r.data.data?.length || 0);
        setSessionList(s.data.data || []);
        setOrders(o.data.data?.length || 0);
        setPerfList(p.data.data || []);
        setTrainingRequests(tr.data.data || []);
        setPlayerOrigin(playerLocationOrigin(profileRes.data?.data));
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sessions = sessionList.length;

  const latestPerf = useMemo(() => {
    const rows = [...perfList].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    return rows[0] || null;
  }, [perfList]);

  const perfPts = useMemo(() => {
    if (!latestPerf) return null;
    const overall = evalOverallScore(latestPerf);
    if (overall == null) return null;
    return overall * 4.2;
  }, [latestPerf]);

  const perfDeltaPct = useMemo(() => {
    const rows = [...perfList].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    if (rows.length < 2) return null;
    const a = evalOverallScore(rows[0]) || 0;
    const b = evalOverallScore(rows[1]) || 0;
    if (b === 0) return a > 0 ? 100 : null;
    return Math.round(((a - b) / b) * 100);
  }, [perfList]);

  const attendancePct = useMemo(() => {
    const total = sessionList.length;
    if (!total) return null;
    const done = sessionList.filter((x) => x.status === 'completed').length;
    return Math.round((done / total) * 100);
  }, [sessionList]);

  const attendanceAlert = useMemo(() => {
    return (notifList || []).find((n) => n.category === 'attendance' && !n.read) || null;
  }, [notifList]);

  const monthlyAbsentCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return sessionList.filter((s) => {
      const at = new Date(s.scheduledAt);
      return s.status === 'completed' && at >= start && s.attendance?.present === false;
    }).length;
  }, [sessionList]);

  const globalRank = useMemo(() => {
    const id = me?._id;
    if (!id) return '—';
    const n = parseInt(String(id).replace(/\D/g, '').slice(-5), 10) || 0;
    return `#${100 + (n % 900)}`;
  }, [me]);

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return [...sessionList]
      .filter((s) => s.status !== 'cancelled' && new Date(s.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 2);
  }, [sessionList]);

  const activityItems = useMemo(() => notifList.slice(0, 5), [notifList]);

  const myCoaches = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const req of trainingRequests) {
      if (req.status !== 'accepted' || !(req.feesClearedAt || req.feesCleared)) continue;
      const coach = req.coach;
      const coachId = String(coach?._id || coach || '');
      if (!coachId || seen.has(coachId)) continue;
      seen.add(coachId);
      list.push({
        coachId,
        coach,
        acceptedAt: req.updatedAt || req.createdAt,
      });
    }
    return list;
  }, [trainingRequests]);

  const fullName = me?.playerProfile?.fullName;
  const first = fullName?.split(/\s+/)[0] || me?.email?.split('@')[0] || 'Player';
  const sportLabel = me?.playerProfile?.sportPreference
    ? me.playerProfile.sportPreference.charAt(0).toUpperCase() + me.playerProfile.sportPreference.slice(1)
    : 'Sport';
  const sportIcon =
    me?.playerProfile?.sportPreference === 'badminton' ? 'sports_tennis' : 'sports_cricket';
  const levelLabel = me?.playerProfile?.skillLevel
    ? me.playerProfile.skillLevel.charAt(0).toUpperCase() + me.playerProfile.skillLevel.slice(1)
    : 'Level';

  const weekBars = useMemo(() => {
    const sorted = [...perfList].sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate)).slice(-7);
    if (!sorted.length) {
      return [
        { h: 40, label: 'MON', active: false },
        { h: 65, label: 'TUE', active: false },
        { h: 85, label: 'WED', active: true },
        { h: 50, label: 'THU', active: false },
        { h: 75, label: 'FRI', active: false },
        { h: 30, label: 'SAT', active: false },
        { h: 20, label: 'SUN', active: false },
      ];
    }
    const max = Math.max(...sorted.map((r) => evalOverallScore(r) || 0), 1);
    const lastIdx = sorted.length - 1;
    return sorted.map((r, i) => {
      const d = new Date(r.weekStartDate);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase();
      const h = Math.max(12, Math.round(((evalOverallScore(r) || 0) / max) * 100));
      return { h, label, active: i === lastIdx };
    });
  }, [perfList]);

  const skillBreakdownRows = useMemo(() => {
    if (!latestPerf) return [];
    if (latestPerf.skillScores?.length && latestPerf.categoryAverages) {
      const cats = Object.entries(latestPerf.categoryAverages).filter(([name]) => name !== 'General');
      const rows = cats.slice(0, 3).map(([label, value]) => ({
        label,
        sub: 'Category average',
        value,
        stroke: '#00FF87',
      }));
      if (rows.length) {
        rows.unshift({
          label: 'Overall',
          sub: sportLabel,
          value: evalOverallScore(latestPerf),
          stroke: '#00B4D8',
        });
      }
      return rows;
    }
    return [
      { label: 'Technique', sub: 'Precision & control', value: latestPerf.technique, stroke: '#00FF87' },
      { label: 'Fitness', sub: 'Stamina & power', value: latestPerf.fitness, stroke: '#00B4D8' },
      { label: 'Attitude', sub: 'Mindset & focus', value: latestPerf.attitude, stroke: '#A855F7' },
    ];
  }, [latestPerf, sportLabel]);

  const chartWeekLabel = latestPerf
    ? `Week of ${new Date(latestPerf.weekStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : 'Latest';
  const chartValue = perfPts != null ? formatPts(perfPts) : '—';
  const chartSub =
    perfDeltaPct != null
      ? `${perfDeltaPct >= 0 ? '+' : ''}${perfDeltaPct}% vs prior`
      : 'Track weekly evaluations';

  return (
    <div className="space-y-10">
      {err ? (
        <div className="midnight-asymmetric border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-300 shadow-lg">
          {err}
        </div>
      ) : null}

      {attendanceAlert ? (
        <div className="midnight-asymmetric border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200 shadow-lg">
          <p className="font-headline text-xs font-bold uppercase tracking-wider text-amber-400">Attendance alert</p>
          <p className="mt-1">{attendanceAlert.body || attendanceAlert.title}</p>
          {monthlyAbsentCount > 0 ? (
            <p className="mt-1 text-xs text-amber-300/80">{monthlyAbsentCount} absence(s) recorded this month.</p>
          ) : null}
          <Link to="/player/notifications" className="mt-2 inline-block text-xs font-bold uppercase tracking-wide text-amber-400 hover:underline">
            View notifications
          </Link>
        </div>
      ) : null}

      <section className="mb-10">
        <div className="relative flex min-h-[240px] flex-col items-center justify-between gap-6 overflow-hidden bg-gradient-to-r from-[#0a5230] via-[#0a6b45] to-player-green p-8 midnight-asymmetric shadow-2xl md:min-h-[200px] md:flex-row md:items-center">
          <div className="landing-pitch-lines absolute inset-0 opacity-25" />
          <span className="material-symbols-outlined pointer-events-none absolute -right-4 -top-2 text-[140px] text-white/10">
            stadium
          </span>
          <div className="z-10 w-full text-center md:text-left">
            <h1 className="mb-2 font-display text-4xl uppercase tracking-tight text-white md:text-6xl lg:text-7xl">
              Welcome back, {first}
            </h1>
            <p className="mb-4 font-headline text-sm uppercase tracking-widest text-white/80">{greetingPrefix()} • Player portal</p>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <div className="flex items-center rounded-full bg-player-bg/30 px-3 py-1 backdrop-blur">
                <PlayerIcon name={sportIcon} className="mr-1 text-lg text-yellow-400" />
                <span className="font-orbitron text-sm font-bold text-white">{sportLabel}</span>
              </div>
              <span className="font-headline text-sm uppercase tracking-widest text-white/80">• {levelLabel}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:justify-start">
              <Link to="/player/coaches" className={playerHeroBtnPrimary}>
                Find coach
              </Link>
              <Link to="/player/profile" className={playerHeroBtnSecondary}>
                Edit profile
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-headline uppercase tracking-wider text-white/70 md:justify-start">
              <Link to="/player/grounds" className="transition-colors hover:text-white">
                Browse grounds
              </Link>
              <span className="text-white/25">|</span>
              <Link to="/player/shop" className="transition-colors hover:text-white">
                Shop
              </Link>
              <span className="text-white/25">|</span>
              <Link to="/player/training" className="transition-colors hover:text-white">
                Schedule
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 translate-x-16 rotate-12 opacity-10 md:block">
            <PlayerIcon name="fitness_center" className="text-[280px] text-white" />
          </div>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <PlayerCard accentLeft="green" className="group hover:bg-player-inner/30">
          <div className="mb-4 flex items-start justify-between">
            <span className="font-headline text-xs font-bold uppercase tracking-[0.14em] text-player-on-variant">Total sessions</span>
            <PlayerIcon name="fitness_center" className="text-player-green" />
          </div>
          <div className="player-stat-figure text-3xl">{sessions}</div>
          <div className="mt-4 flex h-10 items-end gap-1">
            {[40, 20, 70, 50, 30].map((pct, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-sm bg-player-green/20 transition-all duration-500 group-hover:bg-player-green/40"
                  style={{ height: `${pct}%` }}
                />
              </div>
            ))}
          </div>
        </PlayerCard>

        <PlayerCard accentLeft="orange" className="group hover:bg-player-inner/30">
          <div className="mb-4 flex items-start justify-between">
            <span className="font-headline text-xs font-bold uppercase tracking-[0.14em] text-player-on-variant">Performance pts</span>
            <PlayerIcon name="military_tech" className="text-player-green" />
          </div>
          <div className="player-stat-figure text-3xl">{formatPts(perfPts)}</div>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-player-highest">
              <div
                className="h-full bg-gradient-to-r from-player-green to-player-cyan"
                style={{
                  width: `${perfPts != null ? Math.min(100, Math.max(12, Math.round((perfPts / 756) * 100))) : 0}%`,
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-player-green">
              {perfDeltaPct != null ? `${perfDeltaPct >= 0 ? '+' : ''}${perfDeltaPct}%` : '—'}
            </span>
          </div>
        </PlayerCard>

        <PlayerCard accentLeft="violet" className="group hover:bg-player-inner/30">
          <div className="mb-4 flex items-start justify-between">
            <span className="font-headline text-xs font-bold uppercase tracking-[0.14em] text-player-on-variant">Attendance</span>
            <PlayerIcon name="calendar_month" className="text-player-green" />
          </div>
          <div className="player-stat-figure text-3xl">{attendancePct != null ? `${attendancePct}%` : '—'}</div>
          <div className="mt-4">
            <svg className="h-2 w-full" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
              <path
                className="opacity-50"
                d="M0 5 Q 25 0, 50 5 T 100 5"
                fill="none"
                stroke="#00FF87"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path d="M0 5 Q 25 0, 50 5 T 80 5" fill="none" stroke="#00FF87" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
        </PlayerCard>

        <PlayerCard accentLeft="cyan" className="group hover:bg-player-inner/30">
          <div className="mb-4 flex items-start justify-between">
            <span className="font-headline text-xs font-bold uppercase tracking-[0.14em] text-player-on-variant">Global rank</span>
            <PlayerIcon name="trophy" className="text-player-green" />
          </div>
          <div className="player-stat-figure text-3xl">{globalRank}</div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full border-2 border-player-surface bg-player-highest" />
              <div className="h-6 w-6 rounded-full border-2 border-player-surface bg-player-inner" />
              <div className="h-6 w-6 rounded-full border-2 border-player-surface bg-player-container" />
            </div>
            <span className="text-[10px] uppercase tracking-tighter text-player-on-variant">Top tier</span>
          </div>
        </PlayerCard>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-white">Your coach</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/player/my-coach" className="text-xs font-bold uppercase text-player-green hover:underline">
              My coach
            </Link>
            <Link to="/player/training" className="text-xs font-bold uppercase text-player-on-variant hover:text-player-green hover:underline">
              Training schedule
            </Link>
          </div>
        </div>
        <p className="text-sm text-player-on-variant">Coaches who accepted your request and will train you.</p>
        {myCoaches.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {myCoaches.map(({ coachId, coach, acceptedAt }) => {
              const name = coach?.coachProfile?.fullName || coach?.email || 'Coach';
              const specialties = coach?.coachProfile?.specialties;
              return (
                <div
                  key={coachId}
                  className="midnight-asymmetric flex gap-4 border border-player-green/25 bg-player-highest p-5 shadow-xl transition-all hover:border-player-green/50"
                >
                  <CoachAvatar profile={coach?.coachProfile} name={name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-white">{name}</p>
                    <p className="mt-1 text-sm font-medium text-player-green">Your coach will train you</p>
                    <CoachLocationLines
                      profile={coach?.coachProfile}
                      playerOrigin={playerOrigin}
                      className="mt-2"
                    />
                    {specialties?.length ? (
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-player-on-variant">
                        {specialties.slice(0, 3).join(' · ')}
                      </p>
                    ) : null}
                    {acceptedAt ? (
                      <p className="mt-2 text-[10px] text-player-on-variant">
                        Accepted {new Date(acceptedAt).toLocaleDateString()}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        to="/player/my-coach"
                        className="inline-block font-headline text-[10px] font-bold uppercase tracking-widest text-player-green hover:underline"
                      >
                        View coach & feedback →
                      </Link>
                      <Link
                        to="/player/training"
                        className="inline-block font-headline text-[10px] font-bold uppercase tracking-widest text-player-on-variant hover:text-player-green hover:underline"
                      >
                        Sessions & plans →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <PlayerCard>
            <p className="text-sm text-player-on-variant">
              No coach assigned yet. Send a training request from{' '}
              <Link to="/player/coaches" className="font-semibold text-player-green hover:underline">
                Find coach
              </Link>
              .
            </p>
          </PlayerCard>
        )}
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <PlayerCard elevate={false} className="relative p-8 lg:col-span-2">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-white">Weekly session volume</h2>
            <span className={playerBadgeLive}>Live data</span>
          </div>
          <p className="mb-6 text-xs font-medium text-player-on-variant">Overall scores by week (coach evaluations)</p>
          <div className="flex h-64 w-full items-end gap-3 px-2">
            {weekBars.map((bar, i) => (
              <div key={i} className="group flex min-h-0 flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 flex-col justify-end">
                  <div
                    className={`w-full rounded-t-sm transition-colors ${bar.active ? 'bg-player-orange' : 'bg-player-orange/20 group-hover:bg-player-orange'}`}
                    style={{ height: `${bar.h}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-headline font-bold ${bar.active ? 'text-player-green' : 'text-slate-500'}`}
                >
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
          <div className="midnight-asymmetric mt-6 border border-[#434857]/10 bg-player-bg/40 p-3 text-center backdrop-blur-sm">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-player-on-variant">{chartWeekLabel}</p>
            <p className="player-stat-figure text-lg">{chartValue}</p>
            <p className="text-[10px] font-bold text-player-green">{chartSub}</p>
          </div>
        </PlayerCard>

        <PlayerCard accentLeft="green" className="flex flex-col justify-between p-8">
          <h2 className="mb-6 font-headline text-xl font-bold uppercase tracking-wider text-white">Skill breakdown</h2>
          <div className="space-y-8">
            {skillBreakdownRows.map((row) => (
              <SkillArcRow
                key={row.label}
                label={row.label}
                sub={row.sub}
                value={row.value}
                stroke={row.stroke}
              />
            ))}
            {!skillBreakdownRows.length ? (
              <p className="text-sm text-player-on-variant">No evaluation data yet.</p>
            ) : null}
          </div>
          <Link
            to="/player/performance"
            className="mt-8 inline-block text-center font-headline text-xs font-bold uppercase tracking-widest text-player-green hover:underline"
          >
            Full history →
          </Link>
        </PlayerCard>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="mb-2 font-headline text-xl font-bold uppercase tracking-wider text-white">Upcoming sessions</h2>
            <Link to="/player/training" className="text-xs font-bold uppercase text-player-green hover:underline">
              View calendar
            </Link>
          </div>
          <div className="space-y-4">
            {upcomingSessions.map((s) => (
              <div
                key={s._id}
                className="midnight-asymmetric flex flex-col gap-4 border border-[#434857]/10 bg-player-highest p-5 shadow-xl transition-all duration-300 hover:border-player-green/25 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <CoachAvatar profile={s.coach?.coachProfile} name={coachName(s)} size="md" />
                  <div>
                    <p className="text-sm font-bold text-white">{coachName(s)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] font-medium text-player-on-variant">
                      <span className="inline-flex items-center gap-1">
                        <PlayerIcon name="schedule" className="text-xs" />
                        {new Date(s.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <PlayerIcon name="location_on" className="text-xs" />
                        {s.location || 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  to="/player/training"
                  className="shrink-0 rounded-full bg-player-highest px-5 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-player-green hover:text-player-on-accent"
                >
                  View plan
                </Link>
              </div>
            ))}
            {!upcomingSessions.length ? (
              <p className="text-sm text-player-on-variant">No upcoming sessions. Book training from your schedule.</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="mb-2 font-headline text-xl font-bold uppercase tracking-wider text-white">Recent activity</h2>
            <Link to="/player/notifications" className="text-xs font-bold uppercase text-player-on-variant hover:text-player-green">
              View all
            </Link>
          </div>
          <PlayerCard elevate={false} className="divide-y divide-white/5 p-0">
            {activityItems.map((n) => (
              <div key={n._id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-player-green/10">
                    <PlayerIcon name="notifications" className="text-sm text-player-green" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">{n.title}</p>
                    <p className="mt-1 font-headline text-[10px] font-bold uppercase tracking-tighter text-player-on-variant">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 font-headline text-[8px] font-black uppercase ${activityBadge(n.category)}`}>
                  {n.category || 'Alert'}
                </span>
              </div>
            ))}
            {!activityItems.length ? (
              <p className="p-4 text-sm text-player-on-variant">No recent activity.</p>
            ) : null}
          </PlayerCard>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <PlayerCard>
          <h3 className="font-headline text-sm font-bold uppercase tracking-[0.16em] text-player-on-variant">Orders</h3>
          <p className="player-stat-figure mt-2 text-2xl">{orders}</p>
          <Link to="/player/orders" className="mt-3 inline-block text-sm font-semibold text-player-green hover:underline">
            Open orders →
          </Link>
        </PlayerCard>
        <PlayerCard>
          <h3 className="font-headline text-sm font-bold uppercase tracking-[0.16em] text-player-on-variant">Quick links</h3>
          <ul className="mt-3 space-y-2 text-sm text-player-on-variant">
            <li>
              <Link to="/player/profile" className="text-player-green hover:underline">
                Account & profile
              </Link>
            </li>
            <li>
              <Link to="/player/training" className="text-player-green hover:underline">
                Training schedule
              </Link>
            </li>
            <li>
              <Link to="/player/complaint" className="text-player-green hover:underline">
                File a complaint
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-player-on-variant">
            Coach matches available: <span className="font-orbitron font-bold text-player-green">{coaches}</span>
          </p>
        </PlayerCard>
      </section>
    </div>
  );
}

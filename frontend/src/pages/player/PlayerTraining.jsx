import { useEffect, useMemo, useState } from 'react';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import PlayerSessionCard from '../../components/player/PlayerSessionCard';
import PlayerAttendanceSection from '../../components/player/PlayerAttendanceSection';
import PlayerWeeklyPlanCard from '../../components/player/PlayerWeeklyPlanCard';
import CoachAvatar from '../../components/CoachAvatar';
import PlayerIcon from '../../components/player/PlayerIcon';
import { statusBadge } from '../../components/player/playerClassNames';
import { api, getErrorMessage } from '../../services/api';
import { coachAcademyLabel, playerLocationOrigin } from '../../utils/coachLocation';

export default function PlayerTraining() {
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [playerOrigin, setPlayerOrigin] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [a, b, c, profileRes] = await Promise.all([
        api.get('/players/training-requests'),
        api.get('/players/training-sessions'),
        api.get('/players/training-plans'),
        api.get('/players/me/profile').catch(() => ({ data: { data: null } })),
      ]);
      setRequests(a.data.data || []);
      setSessions(b.data.data || []);
      setPlans(c.data.data || []);
      setPlayerOrigin(playerLocationOrigin(profileRes.data?.data));
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up = [];
    const done = [];
    for (const s of sessions) {
      const t = new Date(s.scheduledAt).getTime();
      if (s.status === 'scheduled' && t >= now - 60_000) up.push(s);
      else done.push(s);
    }
    up.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    done.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    return { upcoming: up, past: done };
  }, [sessions]);

  return (
    <div className="space-y-10">
      <PlayerPageHeader
        title="Schedule"
        subtitle="Sessions, attendance, and your coach's weekly training plan."
      />
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <PlayerAttendanceSection sessions={sessions} />

      <section>
        <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">Requests</h2>
        <ul className="mt-3 space-y-2">
          {requests.map((r) => {
            const cp = r.coach?.coachProfile;
            const coachName = cp?.fullName || r.coach?.email || 'Coach';
            const when = r.preferredStart
              ? new Date(r.preferredStart).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : null;
            return (
              <li
                key={r._id}
                className="flex gap-3 rounded-xl border border-white/[0.07] bg-player-container/80 p-3 shadow-sm transition-colors hover:border-player-green/25"
              >
                <CoachAvatar profile={cp} name={coachName} size="sm" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{coachName}</p>
                    <span className={`${statusBadge(r.status)} shrink-0`}>{r.status}</span>
                  </div>
                  {when ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-player-on-variant">
                      <PlayerIcon name="event" className="text-sm text-player-green/90" />
                      Preferred: {when}
                    </p>
                  ) : null}
                  {cp ? (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-player-on-variant">
                      <PlayerIcon name="location_on" className="shrink-0 text-sm text-player-green/90" />
                      {coachAcademyLabel(cp) || '—'}
                    </p>
                  ) : null}
                  {r.status === 'accepted' && r.meetingInstructions ? (
                    <div className="mt-2 rounded-lg border border-player-green/25 bg-player-green/10 p-2.5 text-xs leading-relaxed text-slate-200">
                      {r.meetingInstructions}
                    </div>
                  ) : null}
                  {r.status === 'accepted' ? (
                    <p className="mt-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                      Fees: {r.feesCleared ? 'cleared' : 'pending'} · Session:{' '}
                      {r.sessionStarted ? 'scheduled' : 'after fees'}
                    </p>
                  ) : null}
                  {r.message ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] italic text-slate-500">&ldquo;{r.message}&rdquo;</p>
                  ) : null}
                </div>
              </li>
            );
          })}
          {!requests.length ? <p className="text-sm text-player-on-variant">No requests yet.</p> : null}
        </ul>
      </section>

      <section>
        <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">Upcoming sessions</h2>
        <ul className="mt-3 space-y-2">
          {upcoming.map((s) => (
            <PlayerSessionCard key={s._id} session={s} playerOrigin={playerOrigin} />
          ))}
          {!upcoming.length ? (
            <p className="text-sm text-player-on-variant">
              No upcoming sessions. Your coach will schedule after accepting a request.
            </p>
          ) : null}
        </ul>
      </section>

      {past.length ? (
        <section>
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-slate-500">Past sessions</h2>
          <ul className="mt-3 space-y-2 opacity-90">
            {past.map((s) => (
              <PlayerSessionCard key={s._id} session={s} playerOrigin={playerOrigin} compact showAttendance />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-headline text-xl font-bold uppercase tracking-wide text-player-green md:text-2xl">
          Weekly training plans
        </h2>
        <p className="mt-1 text-sm text-player-on-variant">
          Personalized goals and day-by-day practice from your coach&apos;s evaluation.
        </p>
        <ul className="mt-6 space-y-6">
          {plans.map((p) => (
            <li key={p._id}>
              <PlayerWeeklyPlanCard plan={p} />
            </li>
          ))}
          {!plans.length ? (
            <PlayerCard className="p-6 text-sm text-player-on-variant">
              No weekly plans published yet. After your coach evaluates you and publishes a plan, it will appear here
              with daily drills and improvement priorities.
            </PlayerCard>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

import PlayerAvatar from '../PlayerAvatar';
import PlayerLocationLines from '../PlayerLocationLines';
import ThemedDateTimePicker from './ThemedDateTimePicker';
import { formatProfileLabel } from '../../utils/playerProfile';
import { evalOverallScore } from '../../utils/evaluationDisplay';

function requestStatusClass(status) {
  if (status === 'accepted') return 'bg-player-green/15 text-player-green';
  if (status === 'rejected') return 'bg-red-500/15 text-red-300';
  return 'bg-[#ff7524]/10 text-[#ff7524]';
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DetailCell({ label, value, className = '' }) {
  return (
    <div className={`rounded-lg border border-white/5 bg-player-bg/50 px-3 py-2.5 ${className}`}>
      <p className="font-headline text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm text-slate-200">{value || '—'}</p>
    </div>
  );
}

function PerformanceStrip({ performance }) {
  if (!performance) return null;
  const overall = evalOverallScore(performance);
  const hasSkills = Array.isArray(performance.skillScores) && performance.skillScores.length > 0;
  const topCategories = performance.categoryAverages
    ? Object.entries(performance.categoryAverages)
        .filter(([name]) => name !== 'General')
        .slice(0, 3)
    : [];
  const metrics = hasSkills
    ? topCategories.map(([label, value]) => ({ label, value }))
    : [
        { label: 'Technique', value: performance.technique },
        { label: 'Fitness', value: performance.fitness },
        { label: 'Attitude', value: performance.attitude },
      ];

  return (
    <div className="rounded-lg border border-[#ff7524]/20 bg-[#ff7524]/5 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-headline text-[10px] uppercase tracking-[0.18em] text-[#ff7524]">
          Latest performance
        </p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Week of {formatWhen(performance.weekStartDate)}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-md bg-black/20 px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</p>
            <p className="mt-0.5 font-display text-xl text-white">{m.value ?? '—'}</p>
          </div>
        ))}
        <div className="rounded-md bg-black/20 px-2 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Overall</p>
          <p className="mt-0.5 font-display text-xl text-[#ff7524]">{overall ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

export default function PlayerTrainingRequestCard({
  request,
  coachOrigin,
  scheduledAt,
  onScheduledAtChange,
  meetingLocation,
  onMeetingLocationChange,
  onAccept,
  onReject,
  onMarkFeesCleared,
  onStartSession,
  busy,
}) {
  const profile = request.player?.playerProfile;
  const name = profile?.fullName || request.player?.email || String(request.player?._id || request.player || '');
  const email = request.player?.email || '—';
  const phone = profile?.phone || '—';
  const sport = formatProfileLabel(profile?.sportPreference);
  const skill = formatProfileLabel(profile?.skillLevel);

  return (
    <li className="midnight-asymmetric relative border-l-4 border-[#ff7524] bg-player-surface p-6 shadow-player-card">
      <div className="mb-5 flex gap-4">
        <PlayerAvatar profile={profile} name={name} size="lg" className="ring-2 ring-[#ff7524]/30" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-3xl tracking-[0.06em] text-white sm:text-4xl">{name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sport ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-headline text-[10px] uppercase tracking-wider text-slate-300">
                    {sport}
                  </span>
                ) : null}
                {skill ? (
                  <span className="rounded-full border border-[#ff7524]/30 bg-[#ff7524]/10 px-2.5 py-0.5 font-headline text-[10px] uppercase tracking-wider text-[#ff7524]">
                    {skill}
                  </span>
                ) : null}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 font-orbitron text-[10px] uppercase tracking-widest ${requestStatusClass(request.status)}`}
            >
              {request.status}
            </span>
          </div>
          <PlayerLocationLines profile={profile} coachOrigin={coachOrigin} className="mt-3" />
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <DetailCell label="Email" value={email} />
        <DetailCell label="Phone" value={phone} />
        <DetailCell label="Requested" value={formatWhen(request.createdAt)} />
        <DetailCell label="Preferred start" value={formatWhen(request.preferredStart)} />
      </div>

      {request.latestPerformance ? (
        <div className="mt-4 max-h-40 overflow-y-auto">
          <PerformanceStrip performance={request.latestPerformance} />
        </div>
      ) : null}

      {request.message ? (
        <p className="mt-5 border-l-2 border-[#ff7524]/40 bg-player-bg/60 p-3 text-sm italic leading-relaxed text-slate-300">
          &ldquo;{request.message}&rdquo;
        </p>
      ) : null}

      {request.status === 'accepted' && request.meetingInstructions ? (
        <div className="mt-5 rounded-lg border border-player-green/30 bg-player-green/10 p-4">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-player-green">
            Player instructions
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{request.meetingInstructions}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
            <span
              className={`rounded-full px-2.5 py-1 ${
                request.feesCleared ? 'bg-player-green/20 text-player-green' : 'bg-amber-500/20 text-amber-200'
              }`}
            >
              Fees {request.feesCleared ? 'cleared' : 'pending'}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                request.sessionStarted ? 'bg-player-green/20 text-player-green' : 'bg-white/10 text-slate-400'
              }`}
            >
              Session {request.sessionStarted ? 'created' : 'not started'}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!request.feesCleared && onMarkFeesCleared ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onMarkFeesCleared(request._id)}
                className="bg-[#ff7524] px-4 py-2 font-headline text-[10px] uppercase tracking-wider text-black disabled:opacity-50"
              >
                Mark fees cleared
              </button>
            ) : null}
            {request.feesCleared && !request.sessionStarted && onStartSession ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onStartSession(request._id)}
                className="bg-player-green/25 px-4 py-2 font-headline text-[10px] uppercase tracking-wider text-player-green disabled:opacity-50"
              >
                Create first session
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {request.status === 'pending' ? (
        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Meeting date & time <span className="text-red-400">*</span>
            </label>
            <ThemedDateTimePicker
              value={scheduledAt || ''}
              onChange={onScheduledAtChange}
              placeholder="Pick date & time"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Academy / meeting location
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-white/10 bg-player-bg px-3 py-2 text-sm text-white"
              placeholder={coachOrigin || 'Academy address or map link'}
              value={meetingLocation || ''}
              onChange={(e) => onMeetingLocationChange?.(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            Player will see this meeting info after accept. Create the first session only after training fees are
            cleared.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-5">
        <span className="text-[10px] font-headline uppercase tracking-[0.22em] text-slate-500">Live request</span>
        {request.status === 'pending' ? (
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 font-display text-xl tracking-[0.14em] text-slate-400 transition hover:text-red-400"
              onClick={onReject}
            >
              DECLINE
            </button>
            <button
              type="button"
              disabled={busy || !scheduledAt}
              className="bg-[#ff7524] px-6 py-2 font-display text-xl tracking-[0.14em] text-black shadow-[0_0_20px_rgba(255,107,0,0.25)] transition hover:brightness-110 disabled:opacity-50"
              onClick={onAccept}
            >
              ACCEPT
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

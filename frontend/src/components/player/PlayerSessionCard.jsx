import CoachAvatar from '../CoachAvatar';
import PlayerIcon from './PlayerIcon';
import { statusBadge } from './playerClassNames';
import { coachAcademyLabel, coachDirectionsUrl, coachMapUrl } from '../../utils/coachLocation';

/** Matches coach session spacing rule (90 min). */
export const SESSION_DURATION_MS = 90 * 60 * 1000;

function formatTime(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function sessionWindow(scheduledAt) {
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + SESSION_DURATION_MS);
  return { start, end };
}

export function sessionVenueLabel(session) {
  const custom = String(session?.location || '').trim();
  if (custom) return custom;
  return coachAcademyLabel(session?.coach?.coachProfile) || 'Location TBD';
}

function MetaLine({ icon, children }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 text-xs text-player-on-variant">
      <PlayerIcon name={icon} className="shrink-0 text-[14px] text-player-green/90" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export default function PlayerSessionCard({ session, playerOrigin, compact = false }) {
  const coachProfile = session.coach?.coachProfile;
  const coachName = coachProfile?.fullName || session.coach?.email || 'Coach';
  const window = sessionWindow(session.scheduledAt);
  const venue = sessionVenueLabel(session);
  const mapUrl = coachMapUrl(coachProfile);
  const directionsUrl = coachDirectionsUrl(coachProfile, playerOrigin);

  if (!window) return null;

  const { start, end } = window;
  const dateLine = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const sport = coachProfile?.specialties?.[0];

  return (
    <li
      className={`group flex gap-3 rounded-xl border border-white/[0.07] bg-player-container/80 shadow-sm transition-all hover:border-player-green/30 hover:bg-player-inner/40 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-player-green/20 bg-player-green/5 py-2 text-center">
        <span className="font-display text-xl leading-none text-white">{start.getDate()}</span>
        <span className="mt-0.5 font-headline text-[9px] font-bold uppercase tracking-wide text-player-green">
          {start.toLocaleString(undefined, { month: 'short' })}
        </span>
      </div>

      <CoachAvatar profile={coachProfile} name={coachName} size="sm" className="mt-0.5 hidden sm:flex" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{coachName}</p>
            {sport ? (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{sport}</p>
            ) : null}
          </div>
          <span className={`${statusBadge(session.status)} shrink-0`}>{session.status}</span>
        </div>

        <div className="mt-2 flex flex-col gap-1">
          <MetaLine icon="calendar_today">
            {dateLine} · {formatTime(start)} – {formatTime(end)}
          </MetaLine>
          <MetaLine icon="timelapse">90 min session</MetaLine>
          <MetaLine icon="location_on">{venue}</MetaLine>
        </div>

        {mapUrl || directionsUrl ? (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-player-green underline-offset-2 hover:underline"
              >
                Map
              </a>
            ) : null}
            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-player-green underline-offset-2 hover:underline"
              >
                Directions
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}

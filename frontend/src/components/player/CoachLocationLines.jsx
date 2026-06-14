import PlayerIcon from './PlayerIcon';
import { coachAcademyLabel, coachDirectionsUrl, coachMapUrl } from '../../utils/coachLocation';

export default function CoachLocationLines({ profile, playerOrigin, className = '' }) {
  const label = coachAcademyLabel(profile);
  const mapUrl = coachMapUrl(profile);
  const directionsUrl = coachDirectionsUrl(profile, playerOrigin);

  if (!label && !mapUrl) return null;

  return (
    <div className={`space-y-1 text-xs text-player-on-variant ${className}`}>
      {label ? (
        <p>
          <PlayerIcon name="location_on" className="mr-1 align-middle text-sm text-player-green" />
          {label}
        </p>
      ) : null}
      {mapUrl || directionsUrl ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1 pl-0.5">
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-player-green underline-offset-2 hover:underline"
            >
              View on map
            </a>
          ) : null}
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-player-green underline-offset-2 hover:underline"
            >
              Get directions{playerOrigin ? ' & distance' : ''}
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

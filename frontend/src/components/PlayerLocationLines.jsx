import PlayerIcon from './player/PlayerIcon';
import { playerDirectionsUrl, playerLocationLabel, playerMapSearchUrl } from '../utils/playerProfile';

export default function PlayerLocationLines({ profile, className = '' }) {
  const label = playerLocationLabel(profile);
  const mapUrl = playerMapSearchUrl(profile);
  // Directions to the player only — no coach origin (avoids opening coach map pin).
  const directionsUrl = playerDirectionsUrl(profile);

  return (
    <div className={`space-y-1 text-xs text-slate-400 ${className}`}>
      <p>
        <PlayerIcon name="location_on" className="mr-1 align-middle text-sm text-[#ff7524]" />
        {label || 'Not provided'}
      </p>
      {label && (mapUrl || directionsUrl) ? (
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
              Get directions
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import { publicAssetUrl } from '../utils/assetUrl';
import { groundImageList, groundLocationLabel, isMapUrl } from '../utils/groundImages';

function ImageWithRetry({ path, alt = '', className = '', i = 0 }) {
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 2;

  const handleError = () => {
    if (retries < MAX_RETRIES) {
      setRetries((r) => r + 1);
    }
  };

  const src = publicAssetUrl(path);
  const bustedSrc = src + (src.includes('?') ? '&' : '?') + `retry=${retries}`;

  return (
    <img
      key={`${path}-${i}-${retries}`}
      src={bustedSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}

export function GroundPhotoGrid({ ground, className = '' }) {
  const images = groundImageList(ground);
  if (!images.length) return null;
  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${className}`}>
      {images.map((path, i) => (
        <ImageWithRetry
          key={`${path}-${i}`}
          path={path}
          alt=""
          className="max-h-48 w-full rounded-xl object-cover"
          i={i}
        />
      ))}
    </div>
  );
}

export function GroundPhotoStrip({ ground, className = '' }) {
  const images = groundImageList(ground);
  if (!images.length) {
    return <div className={`h-20 w-full rounded-xl bg-black/30 ${className}`} aria-hidden />;
  }
  return (
    <div className={`flex gap-1 ${className}`}>
      {images.slice(0, 3).map((path, i) => (
        <ImageWithRetry
          key={`${path}-${i}`}
          path={path}
          alt=""
          className="h-20 flex-1 min-w-0 rounded-lg object-cover"
          i={i}
        />
      ))}
      {images.length > 3 ? (
        <span className="flex h-20 w-10 shrink-0 items-center justify-center rounded-lg bg-black/40 text-[10px] font-bold text-slate-400">
          +{images.length - 3}
        </span>
      ) : null}
    </div>
  );
}

function GroundCardImage({ ground, accent = 'player' }) {
  const images = groundImageList(ground);
  const isCoach = accent === 'coach';

  if (!images.length) {
    return (
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-slate-900 to-black">
        <span className="material-symbols-outlined text-3xl text-slate-700">stadium</span>
      </div>
    );
  }

  return (
    <div className="relative h-28 w-full shrink-0 overflow-hidden">
      <ImageWithRetry path={images[0]} alt="" className="h-full w-full object-cover" i={0} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {images.length > 1 ? (
        <span
          className={`absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isCoach ? 'text-[#ffb380]' : 'text-player-green'
          }`}
        >
          +{images.length - 1} photos
        </span>
      ) : null}
    </div>
  );
}

function CompactFact({ icon, label, children, accent = 'player' }) {
  const iconClass = accent === 'coach' ? 'text-[#ff7524]' : 'text-player-green';
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
        <span className={`material-symbols-outlined text-[13px] ${iconClass}`}>{icon}</span>
        {label}
      </p>
      <div className="mt-0.5 text-xs leading-snug text-slate-300">{children}</div>
    </div>
  );
}

function MapLink({ href, linkClassName, label = 'Open in Google Maps' }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${linkClassName}`}
    >
      <span className="material-symbols-outlined text-sm">map</span>
      {label}
    </a>
  );
}

function formatSport(sport) {
  if (!sport) return '—';
  return String(sport).charAt(0).toUpperCase() + String(sport).slice(1);
}

/** Call-to-action — phone booking (no in-app payment). */
export function GroundContactBar({ ground, accent = 'player', compact = false }) {
  if (!ground?.ownerPhone) return null;
  const isCoach = accent === 'coach';
  const wrapClass = isCoach
    ? 'border-[#ff7524]/30 bg-[#ff7524]/10'
    : 'border-player-green/30 bg-player-green/10';
  const titleClass = isCoach ? 'text-[#ff7524]' : 'text-player-green';
  const btnClass = isCoach
    ? 'bg-gradient-to-r from-[#ff7524] to-[#e85d00] text-black shadow-[0_0_20px_rgba(255,117,36,0.25)]'
    : 'bg-gradient-to-r from-player-green to-emerald-500 text-black shadow-[0_0_20px_rgba(155,255,206,0.2)]';

  if (compact) {
    return (
      <a
        href={`tel:${ground.ownerPhone}`}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-headline text-xs font-bold uppercase tracking-wider transition hover:brightness-110 ${btnClass}`}
      >
        <span className="material-symbols-outlined text-base">call</span>
        Call {ground.ownerName}
      </a>
    );
  }

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${wrapClass}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-2xl ${titleClass}`}>support_agent</span>
        <div>
          <p className={`font-headline text-xs font-bold uppercase tracking-wider ${titleClass}`}>
            Book by phone
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            Contact the venue owner directly to confirm your slot and arrange payment. No online checkout on
            this platform.
          </p>
        </div>
      </div>
      <a
        href={`tel:${ground.ownerPhone}`}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-headline text-xs font-bold uppercase tracking-wider transition hover:brightness-110 sm:w-auto ${btnClass}`}
      >
        <span className="material-symbols-outlined text-base">call</span>
        {ground.ownerPhone}
        <span className="hidden sm:inline">· {ground.ownerName}</span>
      </a>
    </div>
  );
}

/** Compact venue card — full details, professional layout, small footprint. */
export function GroundVenueCard({ ground, accent = 'player', hideCallToBook = false }) {
  const [expanded, setExpanded] = useState(false);
  if (!ground) return null;

  const images = groundImageList(ground);
  const loc = groundLocationLabel(ground);
  const isCoach = accent === 'coach';
  const accentBorder = isCoach ? 'border-[#ff7524]/15 hover:border-[#ff7524]/35' : 'border-player-green/15 hover:border-player-green/35';
  const linkClassName = isCoach
    ? 'text-[#ff7524] hover:underline underline-offset-2'
    : 'text-player-green hover:underline underline-offset-2';
  const pillClass = isCoach
    ? 'bg-[#ff7524]/15 text-[#ffb380]'
    : 'bg-player-green/15 text-player-green';
  const btnClass = isCoach
    ? 'bg-[#ff7524] text-black hover:bg-[#ff8f4d]'
    : 'bg-player-green text-black hover:brightness-110';
  const isOnlineBooking = ground.listedBy === 'business_owner' || Boolean(ground.businessOwner);
  const showCall = !hideCallToBook && !isOnlineBooking && ground.ownerPhone;

  const sizeLine = [
    ground.lengthFeet ? `${ground.lengthFeet} ft` : null,
    ground.areaSqFt ? `${Number(ground.areaSqFt).toLocaleString()} sq ft` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-player-container shadow-player-card transition-colors ${accentBorder}`}
    >
      <GroundCardImage ground={ground} accent={accent} />

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-wider ${pillClass}`}>
            {formatSport(ground.sportType)}
          </span>
          {ground.city ? (
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {ground.city}
            </span>
          ) : null}
        </div>

        <h3 className="mt-1.5 font-headline text-base font-bold uppercase leading-tight tracking-wide text-white">
          {ground.name}
        </h3>

        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
          <CompactFact icon="schedule" label="Hours" accent={accent}>
            {ground.openTime || '—'} – {ground.closeTime || '—'}
            <span className="text-slate-500"> · {ground.slotDurationMinutes ?? 60}m slots</span>
          </CompactFact>
          <CompactFact icon="payments" label="Rate" accent={accent}>
            {ground.pricePerHour > 0 ? `PKR ${ground.pricePerHour}/hr` : 'Ask owner'}
          </CompactFact>
          <CompactFact icon="straighten" label="Size" accent={accent}>
            {sizeLine || '—'}
          </CompactFact>
          <CompactFact icon="location_on" label="Venue" accent={accent}>
            <span className="line-clamp-2">{ground.address || loc || '—'}</span>
          </CompactFact>
          <CompactFact icon="person" label="Owner" accent={accent}>
            {ground.ownerName || '—'}
            {ground.ownerPhone ? (
              <>
                <br />
                <a href={`tel:${ground.ownerPhone}`} className={linkClassName}>
                  {ground.ownerPhone}
                </a>
              </>
            ) : null}
          </CompactFact>
        </div>

        {expanded ? (
          <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3 text-xs text-slate-400">
            {ground.description ? <p className="leading-relaxed text-slate-300">{ground.description}</p> : null}
            {ground.ownerAddress ? (
              <p>
                <span className="font-semibold uppercase tracking-wider text-slate-500">Owner address: </span>
                {ground.ownerAddress}
              </p>
            ) : null}
            {loc && loc !== ground.address ? (
              <p>
                <span className="font-semibold uppercase tracking-wider text-slate-500">Location: </span>
                {isMapUrl(loc) ? <MapLink href={loc} linkClassName={linkClassName} label="Open map" /> : loc}
              </p>
            ) : null}
            {isMapUrl(ground.ownerLocation) ? (
              <MapLink href={ground.ownerLocation} linkClassName={linkClassName} label="Owner map" />
            ) : ground.ownerLocation ? (
              <p>{ground.ownerLocation}</p>
            ) : null}
            {images.length > 1 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {images.slice(1).map((path, i) => (
                  <img
                    key={`${path}-${i}`}
                    src={publicAssetUrl(path)}
                    alt=""
                    className="h-12 w-16 rounded object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {showCall ? (
            <a
              href={`tel:${ground.ownerPhone}`}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-wider transition sm:flex-none ${btnClass}`}
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call to book
            </a>
          ) : isOnlineBooking ? (
            <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-player-green/30 bg-player-green/10 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-wider text-player-green sm:flex-none">
              <span className="material-symbols-outlined text-sm">event_available</span>
              Book online in app
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-white/10 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function GroundLocationLine({ ground, linkClassName = 'underline-offset-2 hover:underline' }) {
  const loc = groundLocationLabel(ground);
  if (!loc) return null;
  return (
    <p className="mt-1 text-xs text-slate-400">
      Ground location:{' '}
      {isMapUrl(loc) ? (
        <a href={loc} target="_blank" rel="noreferrer" className={linkClassName}>
          Open map
        </a>
      ) : (
        <span>{loc}</span>
      )}
    </p>
  );
}

export function GroundOwnerLocationLine({ ground, linkClassName = 'underline-offset-2 hover:underline' }) {
  const loc = ground?.ownerLocation;
  if (!loc) return null;
  return (
    <p className="mt-1 text-xs text-slate-400">
      Owner location:{' '}
      {isMapUrl(loc) ? (
        <a href={loc} target="_blank" rel="noreferrer" className={linkClassName}>
          Open map
        </a>
      ) : (
        <span>{loc}</span>
      )}
    </p>
  );
}

const infoLabelClass = 'text-[10px] font-semibold uppercase tracking-wider text-slate-500';

/** Full ground info panel (compact / legacy). */
export function GroundDetailsPanel({
  ground,
  linkClassName = 'text-player-green underline-offset-2 hover:underline',
  slotCheck = null,
  slotAvailableClassName = 'text-player-green',
  showContactBar = false,
  accent = 'player',
}) {
  if (!ground) return null;
  const images = groundImageList(ground);
  const loc = groundLocationLabel(ground);

  return (
    <div className="space-y-4 text-sm text-player-on-surface">
      <GroundPhotoGrid ground={ground} />
      <div>
        <h3 className="font-headline text-xl font-bold uppercase tracking-wide text-white">{ground.name}</h3>
        <p className="mt-1 text-xs uppercase tracking-wider text-player-on-variant">
          {ground.sportType}
          {ground.city ? ` · ${ground.city}` : ''}
        </p>
        {ground.description ? (
          <p className="mt-3 text-sm leading-relaxed text-player-on-variant">{ground.description}</p>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <dt className={infoLabelClass}>Opening hours</dt>
          <dd className="mt-1 text-sm text-white">
            {ground.openTime || '—'} – {ground.closeTime || '—'}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-400">{ground.slotDurationMinutes ?? 60} min slots</dd>
        </div>
        {ground.lengthFeet || ground.areaSqFt ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <dt className={infoLabelClass}>Dimensions</dt>
            <dd className="mt-1 text-sm text-white">
              {ground.lengthFeet ? `${ground.lengthFeet} ft length` : null}
              {ground.lengthFeet && ground.areaSqFt ? ' · ' : null}
              {ground.areaSqFt ? `${Number(ground.areaSqFt).toLocaleString()} sq ft` : null}
            </dd>
            {images.length ? (
              <dd className="mt-0.5 text-xs text-slate-400">{images.length} photos</dd>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <dt className={infoLabelClass}>Owner</dt>
          <dd className="mt-1 text-sm text-white">{ground.ownerName}</dd>
          <dd className="mt-0.5">
            <a className={`text-sm ${linkClassName}`} href={`tel:${ground.ownerPhone}`}>
              {ground.ownerPhone}
            </a>
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 sm:col-span-2">
          <dt className={infoLabelClass}>Address</dt>
          <dd className="mt-1 text-sm text-slate-200">{ground.address || ground.ownerAddress || '—'}</dd>
          {loc ? (
            <dd className="mt-2 text-xs text-slate-400">
              Venue:{' '}
              {isMapUrl(loc) ? (
                <a href={loc} target="_blank" rel="noreferrer" className={linkClassName}>
                  Open map
                </a>
              ) : (
                loc
              )}
            </dd>
          ) : null}
          {ground.ownerLocation ? (
            <dd className="mt-1 text-xs text-slate-400">
              Owner:{' '}
              {isMapUrl(ground.ownerLocation) ? (
                <a href={ground.ownerLocation} target="_blank" rel="noreferrer" className={linkClassName}>
                  Open map
                </a>
              ) : (
                ground.ownerLocation
              )}
            </dd>
          ) : null}
        </div>
      </dl>

      {slotCheck ? (
        <p
          className={`font-headline text-xs font-bold uppercase tracking-wider ${
            slotCheck.available ? slotAvailableClassName : 'text-red-400'
          }`}
        >
          {slotCheck.available
            ? 'Selected time slot is available'
            : 'Selected time slot is not available (booked or held)'}
        </p>
      ) : null}

      {showContactBar ? <GroundContactBar ground={ground} accent={accent} /> : null}
    </div>
  );
}

/** Compact selectable card (legacy booking flows). */
export function GroundBrowseCard({ ground, selected, onSelect, accent = 'player', mode = 'book' }) {
  const images = groundImageList(ground);
  const loc = groundLocationLabel(ground);
  const isCoach = accent === 'coach';
  const selectedBorder = isCoach
    ? 'border-[#ff7524] ring-2 ring-[#ff7524]/30'
    : 'border-player-green ring-2 ring-player-green/30';
  const hoverBorder = isCoach ? 'hover:border-[#ff7524]/40' : 'hover:border-player-green/40';
  const ctaClass = isCoach ? 'text-[#ff7524]' : 'text-player-green';

  return (
    <button
      type="button"
      onClick={() => onSelect(ground._id)}
      className={`w-full overflow-hidden rounded-2xl border bg-player-container p-0 text-left shadow-player-card transition-all ${
        selected ? selectedBorder : `border-white/10 ${hoverBorder}`
      }`}
    >
      <GroundPhotoStrip ground={ground} className="rounded-none" />
      <div className="p-4">
        <p className="font-bold text-white">{ground.name}</p>
        <p className="mt-1 text-xs capitalize text-player-on-variant">
          {ground.sportType}
          {ground.city ? ` · ${ground.city}` : ''}
        </p>
        {loc ? (
          <p className="mt-2 line-clamp-2 text-xs text-slate-400">
            {isMapUrl(loc) ? 'Map link available' : loc}
          </p>
        ) : null}
        {ground.lengthFeet || ground.areaSqFt ? (
          <p className="mt-2 text-xs text-slate-500">
            {ground.lengthFeet ? `${ground.lengthFeet} ft` : null}
            {ground.lengthFeet && ground.areaSqFt ? ' · ' : null}
            {ground.areaSqFt ? `${Number(ground.areaSqFt).toLocaleString()} sq ft` : null}
            {images.length ? ` · ${images.length} photos` : null}
          </p>
        ) : null}
        {ground.openTime && ground.closeTime ? (
          <p className="mt-2 text-xs text-slate-500">
            {ground.openTime} – {ground.closeTime} · {ground.slotDurationMinutes ?? 60} min slots
          </p>
        ) : null}
        <p className={`mt-3 text-[10px] font-bold uppercase tracking-wider ${ctaClass}`}>
          {selected ? 'Viewing details' : mode === 'browse' ? 'View details' : 'Select to book'}
        </p>
      </div>
    </button>
  );
}

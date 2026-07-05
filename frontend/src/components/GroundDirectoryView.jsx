import { useEffect, useMemo, useState } from 'react';
import { GroundVenueCard } from './GroundMedia';
import { api, getErrorMessage } from '../services/api';
import { sportDisplayLabel } from '../utils/sportDisplay';

/**
 * Read-only ground directory for players and coaches.
 */
export default function GroundDirectoryView({
  accent = 'player',
  title,
  subtitle,
  PageHeader,
  selectClassName,
  fieldClassName,
  defaultSport = '',
  bookingHint = false,
}) {
  const [grounds, setGrounds] = useState([]);
  const [sport, setSport] = useState(defaultSport || '');
  const sportLocked = Boolean(defaultSport);
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [err, setErr] = useState('');

  const isCoach = accent === 'coach';
  const accentText = isCoach ? 'text-[#ff7524]' : 'text-player-green';
  const inputCls =
    fieldClassName ||
    (isCoach
      ? 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white'
      : 'w-full rounded-player-nested border border-white/[0.06] bg-player-container py-2.5 px-4 text-sm text-player-on-surface');

  useEffect(() => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (city.trim()) params.set('city', city.trim());
    if (location.trim()) params.set('location', location.trim());
    if (minPrice !== '') params.set('minPrice', minPrice);
    if (maxPrice !== '') params.set('maxPrice', maxPrice);
    const qs = params.toString();
    api
      .get(`/public/grounds${qs ? `?${qs}` : ''}`)
      .then((r) => setGrounds(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, [sport, city, location, minPrice, maxPrice]);

  const filtered = useMemo(() => grounds, [grounds]);

  return (
    <div>
      {PageHeader ? <PageHeader title={title} subtitle={subtitle} /> : null}
      {!PageHeader ? (
        <div className="mb-6">
          <h1 className="font-headline text-2xl font-bold uppercase tracking-[0.08em] text-white">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
      ) : null}

      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}

      <div
        className={`mb-5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
          isCoach ? 'border-[#ff7524]/15 bg-[#ff7524]/5 text-slate-400' : 'border-player-green/15 bg-player-green/5 text-slate-400'
        }`}
      >
        <span className={`material-symbols-outlined text-base ${accentText}`}>info</span>
        <span>
          {bookingHint
            ? 'Use the booking page to reserve slots online. Filters match your sport by default.'
            : 'Venues filtered by sport — adjust price or location as needed.'}
        </span>
      </div>

      {sport ? (
        <p className={`mb-3 text-xs font-semibold uppercase tracking-wider ${accentText}`}>
          Showing {sportDisplayLabel(sport)} venues
        </p>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <select
          className={selectClassName || inputCls}
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          disabled={sportLocked}
        >
          {!sportLocked ? <option value="">All sports</option> : null}
          <option value="cricket">Cricket</option>
          <option value="badminton">Badminton</option>
        </select>
        <input
          className={inputCls}
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Area / location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className={inputCls}
          type="number"
          min="0"
          placeholder="Min price/hr (PKR)"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className={inputCls}
          type="number"
          min="0"
          placeholder="Max price/hr (PKR)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      <p className={`mb-5 text-xs font-medium uppercase tracking-wider ${isCoach ? 'text-slate-400' : 'text-player-on-variant'}`}>
        {filtered.length} venue{filtered.length === 1 ? '' : 's'}
      </p>

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-600">stadium</span>
          <p className="mt-4 font-headline text-sm font-bold uppercase tracking-wider text-slate-400">No venues found</p>
          <p className={`mt-2 text-sm ${isCoach ? 'text-slate-500' : 'text-player-on-variant'}`}>
            Try adjusting your price range or location filters.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <li key={g._id} className="min-w-0">
              <GroundVenueCard ground={g} accent={accent} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

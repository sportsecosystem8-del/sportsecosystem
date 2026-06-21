import { useEffect, useMemo, useState } from 'react';
import { GroundVenueCard } from './GroundMedia';
import { api, getErrorMessage } from '../services/api';

/**
 * Read-only ground directory for players and coaches.
 * Ground data is admin-managed; users browse and call the owner to book.
 */
export default function GroundDirectoryView({
  accent = 'player',
  title,
  subtitle,
  PageHeader,
  selectClassName,
}) {
  const [grounds, setGrounds] = useState([]);
  const [sport, setSport] = useState('');
  const [err, setErr] = useState('');

  const isCoach = accent === 'coach';
  const accentText = isCoach ? 'text-[#ff7524]' : 'text-player-green';

  useEffect(() => {
    api
      .get('/public/grounds')
      .then((r) => setGrounds(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!sport) return grounds;
    return grounds.filter((g) => g.sportType === sport);
  }, [grounds, sport]);

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
        <span>Admin-listed venues · call owner to book & pay by phone</span>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select className={selectClassName} value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">All sports</option>
          <option value="cricket">Cricket</option>
          <option value="badminton">Badminton</option>
        </select>
        <p className={`text-xs font-medium uppercase tracking-wider ${isCoach ? 'text-slate-400' : 'text-player-on-variant'}`}>
          {filtered.length} venue{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-600">stadium</span>
          <p className="mt-4 font-headline text-sm font-bold uppercase tracking-wider text-slate-400">
            No venues found
          </p>
          <p className={`mt-2 text-sm ${isCoach ? 'text-slate-500' : 'text-player-on-variant'}`}>
            {sport ? 'Try another sport filter or check back later.' : 'No active grounds listed yet.'}
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';

export default function CoachSessions() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/coaches/training-sessions')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const mark = async (id, present) => {
    try {
      await api.post(`/coaches/sessions/${id}/attendance`, { present });
      alert('Attendance saved');
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-[0.08em] text-white">WEEKLY SCHEDULE</h1>
        <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Training Timeline</p>
      </div>
      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      {loading ? (
        <p className="mt-6 font-headline text-xs uppercase tracking-[0.2em] text-slate-500">Loading schedule…</p>
      ) : list.length === 0 && !err ? (
        <div className="midnight-asymmetric mt-6 border border-player-inner/40 bg-player-container p-8 text-center shadow-player-card">
          <p className="font-display text-3xl text-white">NO SESSIONS YET</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Players appear here after you accept a training request with a schedule date and time. Accepting without a time
            only links the student — it does not create a session.
          </p>
          <Link
            to="/coach/requests"
            className="mt-6 inline-block bg-[#ff7524] px-6 py-3 font-display text-xl tracking-[0.14em] text-black transition hover:brightness-110"
          >
            GO TO REQUESTS
          </Link>
        </div>
      ) : null}
      <ul className="mt-4 grid gap-4">
        {list.map((s) => (
          <li key={s._id} className="midnight-asymmetric grid gap-4 border border-player-inner/40 bg-player-container p-4 shadow-player-card md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-display text-3xl text-white">{s.player?.playerProfile?.fullName || s.player?.email || `player ${s.player?._id || s.player}`}</p>
              <p className="font-orbitron text-xs uppercase tracking-[0.15em] text-[#ff7524]">{new Date(s.scheduledAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="bg-[#ff7524] px-3 py-2 font-display text-lg tracking-widest text-black" onClick={() => mark(s._id, true)}>
                PRESENT
              </button>
              <button type="button" className="border border-player-inner px-3 py-2 font-display text-lg tracking-widest text-slate-300" onClick={() => mark(s._id, false)}>
                ABSENT
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

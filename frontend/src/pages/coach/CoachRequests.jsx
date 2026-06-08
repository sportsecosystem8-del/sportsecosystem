import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';

export default function CoachRequests() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [scheduledAtById, setScheduledAtById] = useState({});

  const load = () =>
    api
      .get('/coaches/training-requests')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
  }, []);

  const act = async (id, status) => {
    const selected = scheduledAtById[id];
    if (status === 'accepted' && !selected) {
      const ok = window.confirm(
        'No schedule time selected. The request will be accepted but the player will not appear on Weekly Schedule until you accept with a date and time. Continue?',
      );
      if (!ok) return;
    }
    const body =
      status === 'accepted' && selected
        ? { status, scheduledAt: new Date(selected).toISOString() }
        : { status };
    try {
      const res = await api.patch(`/coaches/training-requests/${id}`, body);
      setErr('');
      const note = res.data?.data?.schedulingNote;
      const session = res.data?.data?.session;
      if (note) {
        setInfo(note);
      } else if (status === 'accepted' && session) {
        setInfo('Request accepted and session scheduled. The player will appear on Weekly Schedule.');
      } else if (status === 'accepted') {
        setInfo('');
      } else {
        setInfo('');
      }
      setScheduledAtById((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (e) {
      setInfo('');
      setErr(getErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white">TRAINING REQUESTS</h1>
          <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Management Dashboard</p>
        </div>
      </div>
      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      {info && (
        <div className="mt-4 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">
          {info}
        </div>
      )}
      <ul className="mt-4 grid gap-6 xl:grid-cols-2">
        {list.map((r) => (
          <li key={r._id} className="midnight-asymmetric relative overflow-hidden border-l-4 border-[#ff7524] bg-player-surface p-6 shadow-player-card">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="font-display text-4xl text-white">
                {r.player?.playerProfile?.fullName || r.player?.email || String(r.player?._id || r.player || '')}
                </p>
                <p className="font-headline text-[11px] uppercase tracking-[0.2em] text-slate-500">{r.status}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-orbitron text-[10px] uppercase tracking-widest ${
                  r.status === 'accepted'
                    ? 'bg-player-green/15 text-player-green'
                    : r.status === 'rejected'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-[#ff7524]/10 text-[#ff7524]'
                }`}
              >
                {r.status}
              </span>
            </div>
            {r.message && <p className="mb-6 border-b border-[#ff7524]/20 bg-player-bg/60 p-3 text-sm italic text-slate-300">"{r.message}"</p>}
            {r.status === 'pending' ? (
              <div className="mb-5 space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Schedule time (for Weekly Schedule)
                </label>
                <input
                  type="datetime-local"
                  className="w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
                  value={scheduledAtById[r._id] || ''}
                  onChange={(e) => setScheduledAtById((prev) => ({ ...prev, [r._id]: e.target.value }))}
                />
                <p className="text-xs text-slate-500">
                  Required to add the player to Weekly Schedule. Pick another slot if you get a 90-minute conflict.
                </p>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-white/5 pt-5">
              <span className="text-[10px] font-headline uppercase tracking-[0.22em] text-slate-500">Live request</span>
              {r.status === 'pending' && (
                <div className="flex gap-3">
                  <button type="button" className="px-4 py-2 font-display text-xl tracking-[0.14em] text-slate-400 transition hover:text-red-400" onClick={() => act(r._id, 'rejected')}>
                    DECLINE
                  </button>
                  <button type="button" className="bg-[#ff7524] px-6 py-2 font-display text-xl tracking-[0.14em] text-black shadow-[0_0_20px_rgba(255,107,0,0.25)] transition hover:brightness-110" onClick={() => act(r._id, 'accepted')}>
                    ACCEPT
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

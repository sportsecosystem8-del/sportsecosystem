import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';

export default function BusinessGroundBookings() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/business/ground-bookings')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[0.08em] text-white">GROUND BOOKINGS</h1>
        <p className="mt-2 text-sm text-slate-400">Reservations on your listed venues.</p>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b._id} className="rounded-xl border border-white/10 bg-[#0b1324]/80 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-bold text-white">{b.ground?.name || 'Ground'}</p>
              <span className={`text-xs uppercase ${b.status === 'confirmed' ? 'text-emerald-300' : 'text-amber-200'}`}>
                {b.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              {new Date(b.startTime).toLocaleString()} – {new Date(b.endTime).toLocaleTimeString()}
            </p>
            {b.confirmationToken ? (
              <p className="mt-1 font-mono text-xs text-[#cc97ff]">Ref: {b.confirmationToken}</p>
            ) : null}
            <p className="mt-2 text-sm text-slate-400">
              Guest: {b.guestName || '—'} · {b.guestPhone || '—'}
            </p>
            {b.guestAddress ? <p className="text-xs text-slate-500">{b.guestAddress}</p> : null}
            <p className="mt-1 text-sm text-slate-300">{formatGroundBookingAmount(b.amount)} · {b.paymentNote || ''}</p>
          </li>
        ))}
        {!list.length ? <p className="text-sm text-slate-500">No bookings yet.</p> : null}
      </ul>
    </div>
  );
}

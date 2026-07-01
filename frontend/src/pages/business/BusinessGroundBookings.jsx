import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';
import { formatSlotTimeRange } from '../../utils/groundSlots';

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
        <p className="mt-2 text-sm text-slate-400">Online reservations on your venues — full guest and slot details.</p>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      <ul className="space-y-4">
        {list.map((b) => {
          const g = b.ground || {};
          const slot = { startTime: b.startTime, endTime: b.endTime };
          return (
            <li key={b._id} className="rounded-xl border border-white/10 bg-[#0b1324]/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-white">{g.name || 'Ground'}</p>
                  <p className="mt-1 text-sm capitalize text-slate-400">
                    {g.sportType || '—'} · {g.city || g.location || '—'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                    b.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'
                  }`}
                >
                  {b.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Slot</p>
                  <p className="mt-1 text-sm text-slate-200">{formatSlotTimeRange(slot)}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(b.startTime).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment</p>
                  <p className="mt-1 text-sm text-slate-200">{formatGroundBookingAmount(b.amount)}</p>
                  <p className="mt-1 text-xs text-slate-400">{b.paymentNote || '—'}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Guest</p>
                  <p className="mt-1 text-sm text-slate-200">
                    {b.guestName || '—'} · {b.guestPhone || '—'}
                  </p>
                  {b.guestAddress || b.guestCity ? (
                    <p className="mt-1 text-xs text-slate-400">
                      {[b.guestAddress, b.guestCity].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/5 bg-black/20 p-3 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Venue location</p>
                  <p className="mt-1 text-sm text-slate-200">{g.location || g.address || '—'}</p>
                  {g.pricePerHour ? (
                    <p className="mt-1 text-xs text-slate-400">Listed rate: PKR {g.pricePerHour}/hr</p>
                  ) : null}
                </div>
              </div>

              {b.confirmationToken ? (
                <p className="mt-3 font-mono text-xs text-[#cc97ff]">Booking ref: {b.confirmationToken}</p>
              ) : null}
            </li>
          );
        })}
        {!list.length ? <p className="text-sm text-slate-500">No bookings yet.</p> : null}
      </ul>
    </div>
  );
}

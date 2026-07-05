import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import { playerBtnOutlineSm } from '../../components/player/playerClassNames';
import { api, getErrorMessage } from '../../services/api';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';

function downloadBookingReceipt(booking, ground) {
  const lines = [
    'SPORTS ECOSYSTEM — GROUND BOOKING CONFIRMATION',
    '==========================================',
    '',
    `Reference: ${booking.confirmationToken || booking._id}`,
    `Status: ${booking.status || 'confirmed'}`,
    '',
    'VENUE',
    `Name: ${ground?.name || '—'}`,
    `Sport: ${ground?.sportType || '—'}`,
    `Address: ${ground?.location || ground?.address || ground?.city || '—'}`,
    '',
    'SLOT',
    `Start: ${new Date(booking.startTime).toLocaleString()}`,
    `End: ${new Date(booking.endTime).toLocaleString()}`,
    `Amount: ${formatGroundBookingAmount(booking.amount)}`,
    booking.paymentNote ? `Payment: ${booking.paymentNote}` : null,
    '',
    'GUEST',
    `Name: ${booking.guestName || '—'}`,
    `Phone: ${booking.guestPhone || '—'}`,
    '',
    `Generated: ${new Date().toLocaleString()}`,
  ].filter(Boolean);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ground-booking-${booking.confirmationToken || booking._id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlayerGroundBookings() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => {
    api
      .get('/players/ground-bookings')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  };

  useEffect(() => {
    load();
  }, []);

  const cancelBooking = async (id) => {
    if (!window.confirm('Cancel this booking? The ground owner will be notified and the slot becomes available.')) return;
    setBusyId(id);
    setErr('');
    try {
      await api.delete(`/players/ground-bookings/${id}`);
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusyId('');
    }
  };

  const upcoming = list.filter((b) => b.status === 'confirmed' && new Date(b.startTime) >= new Date());
  const past = list.filter((b) => !(b.status === 'confirmed' && new Date(b.startTime) >= new Date()));

  return (
    <div>
      <PlayerPageHeader
        title="My ground bookings"
        subtitle="Download receipts and cancel upcoming slots — owner gets notified."
      />
      <Link to="/player/grounds" className={`${playerBtnOutlineSm} mb-4 inline-block`}>
        Book another ground
      </Link>
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}

      <section className="space-y-4">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">Upcoming</h2>
        {!upcoming.length ? <p className="text-sm text-slate-500">No upcoming bookings.</p> : null}
        {upcoming.map((b) => (
          <PlayerCard key={b._id} className="text-sm">
            <p className="font-bold text-white">{b.ground?.name || 'Ground'}</p>
            <p className="text-slate-400">
              {new Date(b.startTime).toLocaleString()} — {formatGroundBookingAmount(b.amount)}
            </p>
            <p className="mt-1 font-mono text-xs text-player-green">Ref: {b.confirmationToken}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-player-green/20 px-3 py-1.5 text-xs font-bold uppercase text-player-green"
                onClick={() => downloadBookingReceipt(b, b.ground)}
              >
                Download proof
              </button>
              <button
                type="button"
                disabled={busyId === b._id}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold uppercase text-red-300 disabled:opacity-50"
                onClick={() => cancelBooking(b._id)}
              >
                {busyId === b._id ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </PlayerCard>
        ))}
      </section>

      {past.length ? (
        <section className="mt-8 space-y-4">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-slate-400">History</h2>
          {past.map((b) => (
            <PlayerCard key={b._id} className="text-sm opacity-80">
              <p className="font-bold text-white">{b.ground?.name || 'Ground'}</p>
              <p className="text-slate-400">
                {new Date(b.startTime).toLocaleString()} · <span className="capitalize">{b.status}</span>
              </p>
              {b.confirmationToken ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-player-green underline"
                  onClick={() => downloadBookingReceipt(b, b.ground)}
                >
                  Download proof
                </button>
              ) : null}
            </PlayerCard>
          ))}
        </section>
      ) : null}
    </div>
  );
}

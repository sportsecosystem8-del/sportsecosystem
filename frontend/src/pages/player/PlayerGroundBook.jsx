import { useCallback, useEffect, useState } from 'react';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import PlayerCard from '../../components/player/PlayerCard';
import { GroundVenueCard } from '../../components/GroundMedia';
import StripePaySection, { stripePublishableConfigured } from '../../components/payment/StripePaySection';
import { playerField, playerLabel, playerSelect } from '../../components/player/playerClassNames';
import { api, getErrorMessage } from '../../services/api';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';
import { playerGroundsSubtitle, sportFilterBadge } from '../../utils/sportDisplay';

function downloadBookingReceipt(booking, ground) {
  const lines = [
    'SPORTS ECOSYSTEM — GROUND BOOKING CONFIRMATION',
    '==========================================',
    `Booking ID: ${booking.confirmationToken || booking._id}`,
    `Ground: ${ground?.name || '—'}`,
    `Sport: ${ground?.sportType || '—'}`,
    `When: ${new Date(booking.startTime).toLocaleString()} – ${new Date(booking.endTime).toLocaleTimeString()}`,
    `Location: ${ground?.location || ground?.city || '—'}`,
    `Guest: ${booking.guestName || '—'}`,
    `Phone: ${booking.guestPhone || '—'}`,
    booking.guestAddress ? `Address: ${booking.guestAddress}` : null,
    booking.paymentNote || `Amount: ${formatGroundBookingAmount(booking.amount)}`,
    '',
    'Present this reference at the venue.',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ground-booking-${booking.confirmationToken || booking._id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlayerGroundBook({ defaultSport = '' }) {
  const [sport, setSport] = useState(defaultSport);
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [grounds, setGrounds] = useState([]);
  const [selectedGround, setSelectedGround] = useState(null);
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hold, setHold] = useState(null);
  const [guest, setGuest] = useState({ fullName: '', phone: '', address: '', city: '' });
  const [confirmed, setConfirmed] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const useStripe = stripePublishableConfigured();

  const loadGrounds = useCallback(() => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (city.trim()) params.set('city', city.trim());
    if (maxPrice !== '') params.set('maxPrice', maxPrice);
    if (filterDate && filterTime) {
      const start = new Date(`${filterDate}T${filterTime}`);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        params.set('availableStart', start.toISOString());
        params.set('availableEnd', end.toISOString());
      }
    }
    api
      .get(`/public/grounds?${params}`)
      .then((r) => setGrounds(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, [sport, city, maxPrice, filterDate, filterTime]);

  useEffect(() => {
    loadGrounds();
  }, [loadGrounds]);

  const loadSlots = async (groundId, date) => {
    if (!groundId || !date) return;
    setErr('');
    try {
      const { data } = await api.get(`/public/grounds/${groundId}/slots`, { params: { date } });
      setSlots(data.data?.slots || []);
    } catch (e) {
      setErr(getErrorMessage(e));
      setSlots([]);
    }
  };

  useEffect(() => {
    if (selectedGround && slotDate) loadSlots(selectedGround._id, slotDate);
  }, [selectedGround, slotDate]);

  useEffect(() => {
    if (!hold?._id || !useStripe) {
      setStripeClientSecret('');
      return undefined;
    }
    let cancelled = false;
    api
      .post(`/players/ground-bookings/${hold._id}/payment-intent`)
      .then((r) => {
        if (!cancelled) setStripeClientSecret(r.data?.data?.clientSecret || '');
      })
      .catch((e) => {
        if (!cancelled) setErr(getErrorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [hold?._id, useStripe]);

  const finalizeBooking = async (paymentIntentId) => {
    if (!hold?._id) return;
    setBusy(true);
    setErr('');
    try {
      const payload = {
        guestName: guest.fullName,
        guestPhone: guest.phone,
        guestAddress: guest.address,
        guestCity: guest.city,
      };
      if (paymentIntentId) payload.paymentIntentId = paymentIntentId;
      const { data } = await api.post(`/players/ground-bookings/${hold._id}/confirm-payment`, payload);
      setConfirmed({ booking: data.data, ground: selectedGround });
      setHold(null);
      setSelectedSlot(null);
      setStripeClientSecret('');
      loadGrounds();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (useStripe) return;
    await finalizeBooking();
  };

  const holdSlot = async () => {
    if (!selectedGround || !selectedSlot) return;
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.post('/players/ground-bookings/hold', {
        groundId: selectedGround._id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        amount: selectedSlot.amount,
      });
      setHold(data.data);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const guestFieldsValid = guest.fullName.trim() && guest.phone.trim();

  const handleStripePaid = async (paymentIntentId) => {
    if (!guestFieldsValid) {
      setErr('Enter your name and phone before paying.');
      return;
    }
    await finalizeBooking(paymentIntentId);
  };


  return (
    <div className="space-y-8">
      <PlayerPageHeader title="Book a ground" subtitle={playerGroundsSubtitle(sport)} />
      {sportFilterBadge(sport) ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-player-green">
          {sportFilterBadge(sport)}
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      {confirmed ? (
        <PlayerCard className="border border-player-green/30 bg-player-green/5 p-6">
          <p className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">Booking confirmed</p>
          <p className="mt-2 text-sm text-slate-200">
            Reference: <span className="font-mono text-player-green">{confirmed.booking.confirmationToken}</span>
          </p>
          <p className="mt-2 text-sm text-slate-300">{confirmed.booking.paymentNote}</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-player-green/20 px-4 py-2 text-sm font-bold uppercase tracking-wider text-player-green"
            onClick={() => downloadBookingReceipt(confirmed.booking, confirmed.ground)}
          >
            Download confirmation
          </button>
          <button type="button" className="ml-3 mt-4 text-sm text-slate-400 underline" onClick={() => setConfirmed(null)}>
            Book another
          </button>
        </PlayerCard>
      ) : null}

      <PlayerCard className="p-5">
        <p className={playerLabel}>Filters</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select className={playerSelect} value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="">All sports</option>
            <option value="cricket">Cricket</option>
            <option value="badminton">Badminton</option>
          </select>
          <input className={playerField} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <input
            className={playerField}
            type="number"
            min="0"
            placeholder="Max budget/hr (PKR)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <input className={playerField} type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <input className={playerField} type="time" value={filterTime} onChange={(e) => setFilterTime(e.target.value)} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Date + time filters show only grounds with a free slot at that hour.</p>
      </PlayerCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">Venues ({grounds.length})</h2>
          <ul className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {grounds.map((g) => (
              <li key={g._id}>
                <GroundVenueCard
                  ground={g}
                  selected={selectedGround?._id === g._id}
                  onSelect={() => {
                    setSelectedGround(g);
                    setSlotDate(filterDate || '');
                    setSelectedSlot(null);
                    setHold(null);
                  }}
                  accent="player"
                  mode="book"
                />
              </li>
            ))}
            {!grounds.length ? <p className="text-sm text-slate-500">No grounds match your filters.</p> : null}
          </ul>
        </div>

        <div>
          {selectedGround ? (
            <PlayerCard className="p-5">
              <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">
                {selectedGround.name} — slots
              </h2>
              <input
                className={`${playerField} mt-3`}
                type="date"
                value={slotDate}
                onChange={(e) => {
                  setSlotDate(e.target.value);
                  setSelectedSlot(null);
                  setHold(null);
                }}
              />
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {slots.map((slot) => (
                  <li key={slot.startTime}>
                    <button
                      type="button"
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setHold(null);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        !slot.available
                          ? 'border-red-500/20 bg-red-500/5 text-slate-500 line-through'
                          : selectedSlot?.startTime === slot.startTime
                            ? 'border-player-green bg-player-green/15 text-white'
                            : 'border-white/10 bg-player-inner/40 text-slate-200 hover:border-player-green/40'
                      }`}
                    >
                      {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {slot.available ? (
                        <span className="ml-2 text-player-green">Available · {formatGroundBookingAmount(slot.amount)}</span>
                      ) : (
                        <span className="ml-2 text-red-400">Booked</span>
                      )}
                    </button>
                  </li>
                ))}
                {slotDate && !slots.length ? <p className="text-sm text-slate-500">No slots for this day.</p> : null}
              </ul>

              {selectedSlot && !hold ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={holdSlot}
                  className="mt-4 w-full rounded-lg bg-player-green py-2.5 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
                >
                  {busy ? 'Reserving…' : 'Reserve slot (5 min hold)'}
                </button>
              ) : null}

              {hold ? (
                <form onSubmit={confirmBooking} className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <p className="text-xs text-amber-200">Slot held — complete details to confirm.</p>
                  <input
                    className={playerField}
                    required
                    placeholder="Full name"
                    value={guest.fullName}
                    onChange={(e) => setGuest((g) => ({ ...g, fullName: e.target.value }))}
                  />
                  <input
                    className={playerField}
                    required
                    placeholder="Phone"
                    value={guest.phone}
                    onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
                  />
                  <input
                    className={playerField}
                    placeholder="Address"
                    value={guest.address}
                    onChange={(e) => setGuest((g) => ({ ...g, address: e.target.value }))}
                  />
                  <input
                    className={playerField}
                    placeholder="City"
                    value={guest.city}
                    onChange={(e) => setGuest((g) => ({ ...g, city: e.target.value }))}
                  />
                  {useStripe ? (
                    <div className="space-y-3 border-t border-white/10 pt-3">
                      <p className="text-xs text-slate-400">
                        Pay securely by card, then your booking is confirmed automatically.
                      </p>
                      <StripePaySection
                        clientSecret={stripeClientSecret}
                        onSucceeded={handleStripePaid}
                        onError={(msg) => setErr(msg)}
                        submitLabel="Pay & confirm booking"
                        busyLabel="Processing payment…"
                      />
                      {!stripeClientSecret ? (
                        <p className="text-xs text-slate-500">Preparing secure checkout…</p>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-lg bg-player-green py-2.5 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
                    >
                      {busy ? 'Confirming…' : 'Confirm booking (pay at venue)'}
                    </button>
                  )}
                </form>
              ) : null}
            </PlayerCard>
          ) : (
            <p className="text-sm text-slate-500">Select a venue to view available slots.</p>
          )}
        </div>
      </div>
    </div>
  );
}

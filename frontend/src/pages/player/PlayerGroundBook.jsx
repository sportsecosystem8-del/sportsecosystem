import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import PlayerCard from '../../components/player/PlayerCard';
import { GroundBrowseCard } from '../../components/GroundMedia';
import EasypaisaPaySection from '../../components/payment/EasypaisaPaySection';
import { playerField, playerLabel, playerSelect } from '../../components/player/playerClassNames';
import { api, getErrorMessage } from '../../services/api';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';
import { findNearestAvailableSlot, formatSlotTimeRange } from '../../utils/groundSlots';
import { playerGroundsSubtitle, sportFilterBadge } from '../../utils/sportDisplay';

function downloadBookingReceipt(booking, ground) {
  const lines = [
    'SPORTS ECOSYSTEM — GROUND BOOKING CONFIRMATION',
    '==========================================',
    '',
    'This document is your proof of booking. Present the reference at the venue.',
    '',
    `Reference: ${booking.confirmationToken || booking._id}`,
    `Status: ${booking.status || 'confirmed'}`,
    '',
    'VENUE',
    `Name: ${ground?.name || '—'}`,
    `Sport: ${ground?.sportType || '—'}`,
    `Address: ${ground?.location || ground?.address || ground?.city || '—'}`,
    `Rate: ${ground?.pricePerHour ? `PKR ${ground.pricePerHour}/hour` : '—'}`,
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
    booking.guestAddress ? `Address: ${booking.guestAddress}` : null,
    booking.guestCity ? `City: ${booking.guestCity}` : null,
    '',
    'Booked via Sports Ecosystem Platform — payment to ground owner via Easypaisa.',
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

export default function PlayerGroundBook({ defaultSport = '' }) {
  const [sport, setSport] = useState(defaultSport);
  const sportLocked = Boolean(defaultSport);

  useEffect(() => {
    if (defaultSport) setSport(defaultSport);
  }, [defaultSport]);
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [grounds, setGrounds] = useState([]);
  const [selectedGround, setSelectedGround] = useState(null);
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [suggestedSlot, setSuggestedSlot] = useState(null);
  const [hold, setHold] = useState(null);
  const [guest, setGuest] = useState({ fullName: '', phone: '', address: '', city: '' });
  const [paySession, setPaySession] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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

  const loadSlots = useCallback(async (groundId, date, preferStart) => {
    if (!groundId || !date) return;
    setErr('');
    try {
      const params = { date };
      if (preferStart) params.preferStart = preferStart;
      const { data } = await api.get(`/public/grounds/${groundId}/slots`, { params });
      const list = data.data?.slots || [];
      setSlots(list);
      const nearest = data.data?.nearestAvailable || (preferStart ? findNearestAvailableSlot(list, preferStart) : null);
      setSuggestedSlot(nearest);
    } catch (e) {
      setErr(getErrorMessage(e));
      setSlots([]);
      setSuggestedSlot(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedGround || !slotDate) return;
    let preferStart;
    if (filterDate && filterTime && slotDate === filterDate) {
      const t = new Date(`${filterDate}T${filterTime}`);
      if (!Number.isNaN(t.getTime())) preferStart = t.toISOString();
    }
    loadSlots(selectedGround._id, slotDate, preferStart);
  }, [selectedGround, slotDate, filterDate, filterTime, loadSlots]);

  const loadPaySession = useCallback(() => {
    if (!hold?._id) {
      setPaySession(null);
      setPayErr('');
      setPayLoading(false);
      return;
    }
    setPayLoading(true);
    setPayErr('');
    api
      .post(`/players/ground-bookings/${hold._id}/easypaisa/initiate`)
      .then((r) => {
        const session = r.data?.data || null;
        setPaySession(session);
        if (!session) setPayErr('Could not load payment account details.');
      })
      .catch((e) => {
        setPaySession(null);
        const msg = getErrorMessage(e);
        setPayErr(msg);
        setErr(msg);
      })
      .finally(() => setPayLoading(false));
  }, [hold?._id]);

  useEffect(() => {
    if (!hold?._id || !guest.fullName.trim() || !guest.phone.trim()) {
      setPaySession(null);
      setPayErr('');
      setPayLoading(false);
      return;
    }
    loadPaySession();
  }, [hold?._id, guest.fullName, guest.phone, loadPaySession]);

  const finalizeBooking = async (paymentPayload = {}) => {
    if (!hold?._id) return;
    setBusy(true);
    setErr('');
    try {
      const payload = {
        guestName: guest.fullName,
        guestPhone: guest.phone,
        guestAddress: guest.address,
        guestCity: guest.city,
        ...paymentPayload,
      };
      const { data } = await api.post(`/players/ground-bookings/${hold._id}/confirm-payment`, payload);
      setConfirmed({ booking: data.data, ground: selectedGround });
      setHold(null);
      setSelectedSlot(null);
      setSuggestedSlot(null);
      setPaySession(null);
      loadGrounds();
    } catch (e) {
      setErr(getErrorMessage(e));
      throw e;
    } finally {
      setBusy(false);
    }
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

  const pickSlot = (slot) => {
    setHold(null);
    setPaySession(null);
    if (!slot.available) {
      const nearest = findNearestAvailableSlot(slots, slot.startTime);
      setSuggestedSlot(nearest);
      setSelectedSlot(null);
      if (!nearest) setErr('This slot is booked and no other slots are available this day.');
      return;
    }
    setErr('');
    setSuggestedSlot(null);
    setSelectedSlot(slot);
  };

  const acceptSuggestedSlot = () => {
    if (!suggestedSlot?.available) return;
    setErr('');
    setSelectedSlot(suggestedSlot);
    setSuggestedSlot(null);
  };

  const selectGround = (groundId) => {
    const g = grounds.find((x) => x._id === groundId);
    if (!g) return;
    setSelectedGround(g);
    setSlotDate(filterDate || '');
    setSelectedSlot(null);
    setSuggestedSlot(null);
    setHold(null);
    setPaySession(null);
  };

  const guestFieldsValid = guest.fullName.trim() && guest.phone.trim();

  return (
    <div className="space-y-8">
      <PlayerPageHeader
        title="Book a ground"
        subtitle={playerGroundsSubtitle(sport)}
      />
      <p className="text-xs text-slate-500">
        Pay via Easypaisa to the ground owner when you book.{' '}
        <Link to="/player/ground-bookings" className="text-player-green underline">
          My bookings
        </Link>
      </p>
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
            Download confirmation proof
          </button>
          <Link to="/player/ground-bookings" className="ml-3 mt-4 inline-block text-sm text-slate-400 underline">
            View all bookings
          </Link>
          <button type="button" className="ml-3 mt-4 text-sm text-slate-400 underline" onClick={() => setConfirmed(null)}>
            Book another
          </button>
        </PlayerCard>
      ) : null}

      <PlayerCard className="p-5">
        <p className={playerLabel}>Filters</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            className={playerSelect}
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            disabled={sportLocked}
          >
            {!sportLocked ? <option value="">All sports</option> : null}
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
        <p className="mt-2 text-xs text-slate-500">
          Filter by sport, city, budget, and preferred date/time. Advance Easypaisa payment secures your slot.
        </p>
      </PlayerCard>

      <div className="space-y-6">
        <div>
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">
            Venues ({grounds.length})
          </h2>
          {!grounds.length ? (
            <p className="mt-3 text-sm text-slate-500">No grounds match your filters.</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {grounds.map((g) => (
                <li key={g._id} className="min-w-0">
                  <GroundBrowseCard
                    ground={g}
                    selected={selectedGround?._id === g._id}
                    onSelect={selectGround}
                    accent="player"
                    mode="book"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {selectedGround ? (
            <PlayerCard className="p-5">
              <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">
                {selectedGround.name} — pick a slot
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedGround.location || selectedGround.city || '—'} ·{' '}
                {selectedGround.pricePerHour ? `PKR ${selectedGround.pricePerHour}/hr` : 'Ask rate'}
              </p>
              <input
                className={`${playerField} mt-3`}
                type="date"
                value={slotDate}
                onChange={(e) => {
                  setSlotDate(e.target.value);
                  setSelectedSlot(null);
                  setSuggestedSlot(null);
                  setHold(null);
                  setPaySession(null);
                }}
              />
              {suggestedSlot && !selectedSlot ? (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-100">
                    Your preferred time is not available. Nearest open slot:{' '}
                    <span className="font-semibold">{formatSlotTimeRange(suggestedSlot)}</span>
                    {suggestedSlot.amount ? (
                      <span> · {formatGroundBookingAmount(suggestedSlot.amount)}</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={acceptSuggestedSlot}
                    className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-200 underline"
                  >
                    Use this slot
                  </button>
                </div>
              ) : null}
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {slots.map((slot) => (
                  <li key={slot.startTime}>
                    <button
                      type="button"
                      onClick={() => pickSlot(slot)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        !slot.available
                          ? 'border-red-500/20 bg-red-500/5 text-slate-500'
                          : selectedSlot?.startTime === slot.startTime
                            ? 'border-player-green bg-player-green/15 text-white'
                            : 'border-white/10 bg-player-inner/40 text-slate-200 hover:border-player-green/40'
                      }`}
                    >
                      {formatSlotTimeRange(slot)}
                      {slot.available ? (
                        <span className="ml-2 text-player-green">
                          Available · {formatGroundBookingAmount(slot.amount)}
                        </span>
                      ) : (
                        <span className="ml-2 text-red-400">Booked — tap for nearest</span>
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
                  {busy ? 'Reserving…' : 'Reserve slot'}
                </button>
              ) : null}

              {hold ? (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <p className="text-xs text-amber-200">Slot held — enter your details, then pay via Easypaisa.</p>
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
                  {guestFieldsValid ? (
                    paySession ? (
                      <EasypaisaPaySection
                        session={paySession}
                        busy={busy}
                        onConfirm={finalizeBooking}
                        onError={(msg) => setErr(msg)}
                        submitLabel="Verify & confirm booking"
                      />
                    ) : payLoading ? (
                      <p className="text-xs text-slate-500">Preparing Easypaisa checkout…</p>
                    ) : payErr ? (
                      <p className="text-sm text-red-400">{payErr}</p>
                    ) : (
                      <p className="text-xs text-slate-500">Preparing Easypaisa checkout…</p>
                    )
                  ) : (
                    <p className="text-xs text-slate-500">Enter name and phone to load payment.</p>
                  )}
                </div>
              ) : null}
            </PlayerCard>
          ) : (
            <p className="text-sm text-slate-500">Select a venue to view available slots and book online.</p>
          )}
        </div>
      </div>
    </div>
  );
}

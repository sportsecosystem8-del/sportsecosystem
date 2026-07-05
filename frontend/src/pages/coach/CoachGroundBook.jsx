import { useCallback, useEffect, useState } from 'react';
import { GroundBrowseCard } from '../../components/GroundMedia';
import EasypaisaPaySection from '../../components/payment/EasypaisaPaySection';
import { coachField, coachLabel, coachSelect } from '../../components/coach/coachClassNames';
import { api, getErrorMessage } from '../../services/api';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';
import { formatSlotTimeRange } from '../../utils/groundSlots';
import { coachGroundsSubtitle, sportFilterBadge } from '../../utils/sportDisplay';

export default function CoachGroundBook({ defaultSport = '' }) {
  const [sport, setSport] = useState(defaultSport);
  const sportLocked = Boolean(defaultSport);
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [grounds, setGrounds] = useState([]);
  const [selectedGround, setSelectedGround] = useState(null);
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [suggestedSlot, setSuggestedSlot] = useState(null);
  const [hold, setHold] = useState(null);
  const [guest, setGuest] = useState({ fullName: '', phone: '', address: '', city: '' });
  const [paySession, setPaySession] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultSport) setSport(defaultSport);
  }, [defaultSport]);

  useEffect(() => {
    api
      .get('/coaches/me/profile')
      .then((r) => {
        const p = r.data?.data;
        if (!defaultSport && Array.isArray(p?.specialties) && p.specialties[0]) setSport(p.specialties[0]);
        setGuest((g) => ({
          fullName: g.fullName || p?.fullName || '',
          phone: g.phone || p?.phone || '',
          address: g.address || p?.academyLocation || '',
          city: g.city || p?.city || '',
        }));
      })
      .catch(() => {});
  }, [defaultSport]);

  const loadGrounds = useCallback(() => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (city.trim()) params.set('city', city.trim());
    if (maxPrice !== '') params.set('maxPrice', maxPrice);
    api
      .get(`/public/grounds?${params}`)
      .then((r) => setGrounds(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, [sport, city, maxPrice]);

  useEffect(() => {
    loadGrounds();
  }, [loadGrounds]);

  const loadSlots = useCallback(async (groundId, date) => {
    if (!groundId || !date) return;
    setErr('');
    try {
      const { data } = await api.get(`/public/grounds/${groundId}/slots`, { params: { date } });
      setSlots(data.data?.slots || []);
      setSuggestedSlot(data.data?.nearestAvailable || null);
    } catch (e) {
      setErr(getErrorMessage(e));
      setSlots([]);
      setSuggestedSlot(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedGround || !slotDate) return;
    loadSlots(selectedGround._id, slotDate);
  }, [selectedGround, slotDate, loadSlots]);

  useEffect(() => {
    if (!hold?._id || !guest.phone.trim()) {
      setPaySession(null);
      return;
    }
    api
      .post(`/coaches/ground-bookings/${hold._id}/easypaisa/initiate`)
      .then((r) => setPaySession(r.data?.data || null))
      .catch((e) => {
        setPaySession(null);
        setErr(getErrorMessage(e));
      });
  }, [hold?._id, guest.phone]);

  const finalizeBooking = async (paymentPayload = {}) => {
    if (!hold?._id) return;
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.post(`/coaches/ground-bookings/${hold._id}/confirm-payment`, {
        guestName: guest.fullName,
        guestPhone: guest.phone,
        guestAddress: guest.address,
        guestCity: guest.city,
        ...paymentPayload,
      });
      setConfirmed({ booking: data.data, ground: selectedGround });
      setHold(null);
      setSelectedSlot(null);
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
      const { data } = await api.post('/coaches/ground-bookings/hold', {
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

  const selectGround = (groundId) => {
    const g = grounds.find((x) => x._id === groundId);
    if (!g) return;
    setSelectedGround(g);
    setSlotDate(filterDate || '');
    setSelectedSlot(null);
    setHold(null);
    setPaySession(null);
  };

  return (
    <div className="mt-10 space-y-6 border-t border-[#ff7524]/20 pt-10">
      <div>
        <h2 className="font-display text-3xl tracking-[0.1em] text-white">BOOK A GROUND</h2>
        <p className="mt-1 text-sm text-slate-400">{coachGroundsSubtitle(sport)}</p>
        {sportFilterBadge(sport) ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#ff7524]">{sportFilterBadge(sport)}</p>
        ) : null}
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {confirmed ? (
        <div className="rounded-xl border border-[#ff7524]/30 bg-[#ff7524]/10 p-5">
          <p className="font-headline text-sm font-bold uppercase text-[#ff7524]">Booking confirmed</p>
          <p className="mt-2 text-sm text-slate-200">
            Reference: <span className="font-mono">{confirmed.booking.confirmationToken}</span>
          </p>
          <button type="button" className="mt-3 text-sm text-slate-400 underline" onClick={() => setConfirmed(null)}>
            Book another
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select className={coachSelect} value={sport} onChange={(e) => setSport(e.target.value)} disabled={sportLocked}>
          {!sportLocked ? <option value="">All sports</option> : null}
          <option value="cricket">Cricket</option>
          <option value="badminton">Badminton</option>
        </select>
        <input className={coachField} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input
          className={coachField}
          type="number"
          min="0"
          placeholder="Max budget/hr"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <input className={coachField} type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {grounds.map((g) => (
          <li key={g._id} className="min-w-0">
            <GroundBrowseCard ground={g} selected={selectedGround?._id === g._id} onSelect={selectGround} accent="coach" mode="book" />
          </li>
        ))}
      </ul>

      {selectedGround ? (
        <div className="rounded-xl border border-white/10 bg-black/25 p-5">
          <p className={coachLabel}>{selectedGround.name} — pick a slot</p>
          <input className={`${coachField} mt-3`} type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
          {suggestedSlot && !selectedSlot ? (
            <button type="button" className="mt-2 text-xs text-amber-200 underline" onClick={() => setSelectedSlot(suggestedSlot)}>
              Use nearest slot: {formatSlotTimeRange(suggestedSlot)}
            </button>
          ) : null}
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {slots.map((slot) => (
              <li key={slot.startTime}>
                <button
                  type="button"
                  onClick={() => {
                    setHold(null);
                    setPaySession(null);
                    if (slot.available) setSelectedSlot(slot);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedSlot?.startTime === slot.startTime
                      ? 'border-[#ff7524] bg-[#ff7524]/15 text-white'
                      : 'border-white/10 text-slate-200'
                  }`}
                >
                  {formatSlotTimeRange(slot)}
                  {slot.available ? (
                    <span className="ml-2 text-[#ff7524]">· {formatGroundBookingAmount(slot.amount)}</span>
                  ) : (
                    <span className="ml-2 text-red-400">Booked</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {selectedSlot && !hold ? (
            <button type="button" disabled={busy} onClick={holdSlot} className="mt-4 bg-[#ff7524] px-6 py-2 font-headline text-xs uppercase text-black">
              Reserve slot
            </button>
          ) : null}
          {hold ? (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <input className={coachField} placeholder="Phone (required)" value={guest.phone} onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} />
              <input className={coachField} placeholder="Name" value={guest.fullName} onChange={(e) => setGuest((g) => ({ ...g, fullName: e.target.value }))} />
              {guest.phone.trim() && paySession ? (
                <EasypaisaPaySection session={paySession} busy={busy} onConfirm={finalizeBooking} onError={setErr} submitLabel="Verify & confirm" />
              ) : (
                <p className="text-xs text-slate-500">Enter phone to load Easypaisa checkout.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

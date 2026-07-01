/** Find closest available slot to a target ISO start time. */
export function findNearestAvailableSlot(slots, targetStartISO) {
  if (!Array.isArray(slots) || !targetStartISO) return null;
  const target = new Date(targetStartISO).getTime();
  if (Number.isNaN(target)) return null;
  let best = null;
  let bestDist = Infinity;
  for (const slot of slots) {
    if (!slot?.available) continue;
    const start = new Date(slot.startTime).getTime();
    if (Number.isNaN(start)) continue;
    const dist = Math.abs(start - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot;
    }
  }
  return best;
}

export function formatSlotTimeRange(slot) {
  if (!slot?.startTime) return '—';
  const start = new Date(slot.startTime);
  const end = slot.endTime ? new Date(slot.endTime) : null;
  const t = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return end && !Number.isNaN(end.getTime()) ? `${t(start)} – ${t(end)}` : t(start);
}

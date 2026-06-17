import { resolveUserRefId } from './objectId';

/** Accepted training-request players for coach dropdowns (plans, evaluations). */
export function studentsFromAcceptedRequests(requests) {
  const seen = new Set();
  const list = [];
  for (const tr of requests) {
    if (tr.status !== 'accepted') continue;
    const playerId = resolveUserRefId(tr.player);
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    list.push({
      playerId,
      fullName: tr.player?.playerProfile?.fullName || tr.player?.email || 'Player',
      sportPreference: tr.player?.playerProfile?.sportPreference || '',
      city: tr.player?.playerProfile?.city || '',
    });
  }
  return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

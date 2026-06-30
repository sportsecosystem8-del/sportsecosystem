/** Shared sport labels & icons for player/coach panels */

export function sportDisplayLabel(sport) {
  if (!sport) return 'Sport';
  const s = String(sport).toLowerCase();
  if (s === 'badminton') return 'Badminton';
  if (s === 'football') return 'Football';
  if (s === 'cricket') return 'Cricket';
  if (s === 'general') return 'General';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function sportMaterialIcon(sport) {
  const s = String(sport || '').toLowerCase();
  if (s === 'badminton') return 'sports_tennis';
  if (s === 'football') return 'sports_soccer';
  return 'sports_cricket';
}

export function playerCoachesSubtitle(sport) {
  const label = sportDisplayLabel(sport);
  return `Verified ${label.toLowerCase()} coaches matched to your skill, schedule, and city.`;
}

export function playerShopSubtitle(sport) {
  const label = sportDisplayLabel(sport);
  return `${label} equipment and general gear from verified stores — filtered for your sport.`;
}

export function playerGroundsSubtitle(sport) {
  const label = sportDisplayLabel(sport);
  return `Book ${label.toLowerCase()} indoor slots — real-time availability and budget filters.`;
}

export function sportFilterBadge(sport) {
  if (!sport) return null;
  return `Filtered for ${sportDisplayLabel(sport)}`;
}

/** Icons for player shell header — reflects primary sport */
export function playerHeaderIcons(sport) {
  const icon = sportMaterialIcon(sport);
  if (icon === 'sports_tennis') return ['sports_tennis', 'sports_tennis'];
  if (icon === 'sports_soccer') return ['sports_soccer', 'sports_soccer'];
  return ['sports_cricket', 'sports_tennis'];
}

export function coachGroundsSubtitle(sport) {
  const label = sportDisplayLabel(sport);
  return `Verified ${label.toLowerCase()} venues — filter by budget and location.`;
}

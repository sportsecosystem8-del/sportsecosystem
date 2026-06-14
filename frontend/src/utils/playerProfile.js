export function playerLocationLabel(profile) {
  const address = String(profile?.address || '').trim();
  const city = String(profile?.city || '').trim();
  if (address && city && !address.toLowerCase().includes(city.toLowerCase())) {
    return `${address}, ${city}`;
  }
  return address || city || '';
}

export function playerMapSearchUrl(profile) {
  const label = playerLocationLabel(profile);
  if (!label) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

export function playerDirectionsUrl(profile, origin) {
  const destination = playerLocationLabel(profile);
  if (!destination) return null;
  const params = new URLSearchParams({ destination });
  const from = String(origin || '').trim();
  if (from) params.set('origin', from);
  params.set('travelmode', 'driving');
  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`;
}

export function formatProfileLabel(value) {
  if (!value) return '';
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

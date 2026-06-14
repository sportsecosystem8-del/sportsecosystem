import { isMapUrl } from './groundImages';

export function coachAcademyLabel(profile) {
  const academy = String(profile?.academyLocation || '').trim();
  const city = String(profile?.city || '').trim();
  if (academy && city && !academy.toLowerCase().includes(city.toLowerCase())) {
    return `${academy}, ${city}`;
  }
  return academy || city || '';
}

export function coachMapUrl(profile) {
  const url = String(profile?.locationMapUrl || '').trim();
  return isMapUrl(url) ? url : null;
}

/** Player profile text used as Google Maps directions origin. */
export function playerLocationOrigin(playerProfile) {
  if (!playerProfile) return '';
  const address = String(playerProfile.address || '').trim();
  const city = String(playerProfile.city || '').trim();
  if (address && city) return `${address}, ${city}`;
  return address || city || '';
}

export function coachDirectionsUrl(profile, playerOrigin) {
  const destination = coachMapUrl(profile) || coachAcademyLabel(profile);
  if (!destination) return null;
  const params = new URLSearchParams({ destination });
  const origin = String(playerOrigin || '').trim();
  if (origin) params.set('origin', origin);
  params.set('travelmode', 'driving');
  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`;
}

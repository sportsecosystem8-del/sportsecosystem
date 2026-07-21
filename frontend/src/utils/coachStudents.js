import { resolveUserRefId } from './objectId';

/** True when training is fully active (accepted + fees cleared). */
export function isActiveTrainingRequest(tr) {
  return tr?.status === 'accepted' && Boolean(tr.feesClearedAt || tr.feesCleared);
}

/** Active (fees-cleared) training-request players for coach dropdowns (plans, evaluations). */
export function studentsFromAcceptedRequests(requests) {
  return studentsFromActiveTraining(requests);
}

/** Active training-request players for coach dropdowns (plans, evaluations, payments). */
export function studentsFromActiveTraining(requests) {
  const seen = new Set();
  const list = [];
  for (const tr of requests) {
    if (!isActiveTrainingRequest(tr)) continue;
    const playerId = resolveUserRefId(tr.player);
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    list.push({
      playerId,
      fullName: tr.player?.playerProfile?.fullName || tr.player?.email || 'Player',
      email: tr.player?.email || '',
      sportPreference: tr.player?.playerProfile?.sportPreference || '',
      playerCategory: tr.player?.playerProfile?.playerCategory || '',
      skillLevel: tr.player?.playerProfile?.skillLevel || '',
      city: tr.player?.playerProfile?.city || '',
      profilePhotoUrl: tr.player?.playerProfile?.profilePhotoUrl || '',
      updatedAt: tr.player?.playerProfile?.updatedAt,
      coachRollNo: tr.coachRollNo || '',
    });
  }
  return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function matchesStudentQuery(student, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    student.fullName,
    student.email,
    student.city,
    student.sportPreference,
    student.skillLevel,
    student.coachRollNo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

/** Dropdown label — name plus city/sport/email so same-name students stay distinct. */
export function formatStudentOptionLabel(student) {
  const parts = [student.fullName];
  if (student.coachRollNo) parts.push(`#${student.coachRollNo}`);
  if (student.city) parts.push(student.city);
  if (student.sportPreference) parts.push(student.sportPreference);
  if (student.email) parts.push(student.email);
  return parts.join(' · ');
}

export function studentInitials(name) {
  const parts = String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 2).toUpperCase();
}

export function matchesTrainingRequestQuery(request, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const p = request.player?.playerProfile;
  const hay = [
    p?.fullName,
    request.player?.email,
    p?.city,
    p?.phone,
    p?.sportPreference,
    p?.skillLevel,
    request.status,
    request.message,
    request.coachRollNo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

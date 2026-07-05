/** Normalize coach-assigned student roll / ID (unique per coach). */
function normalizeCoachRollNo(raw) {
  const s = String(raw ?? '').trim();
  if (!s || s.length > 32) return null;
  return s;
}

function formatStudentWithRoll(fullName, coachRollNo) {
  const name = fullName || 'Student';
  if (!coachRollNo) return name;
  return `${name} · #${coachRollNo}`;
}

module.exports = {
  normalizeCoachRollNo,
  formatStudentWithRoll,
};

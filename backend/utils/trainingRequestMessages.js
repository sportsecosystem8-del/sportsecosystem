function formatMeetingWhen(d) {
  return new Date(d).toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildMeetingInstructions(tr, coachProfile) {
  const academy = tr.meetingAcademyName || coachProfile?.fullName || 'Academy';
  const loc = tr.meetingLocation || coachProfile?.academyLocation || coachProfile?.city || 'Contact your coach';
  const when = tr.meetingAt ? formatMeetingWhen(tr.meetingAt) : null;
  return [
    when ? `Please arrive on ${when}.` : 'Your coach will confirm the meeting time.',
    `Location: ${loc}`,
    `Academy: ${academy}`,
    tr.feesClearedAt
      ? 'Fees cleared — your coach will start your training sessions.'
      : 'Pay your training fees to the coach before your first session begins.',
  ].join(' ');
}

module.exports = { formatMeetingWhen, buildMeetingInstructions };

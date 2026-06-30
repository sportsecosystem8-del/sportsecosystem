import PlayerCard from './PlayerCard';

function AttendancePill({ present }) {
  if (present === true) {
    return (
      <span className="rounded-full bg-player-green/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-player-green">
        Present
      </span>
    );
  }
  if (present === false) {
    return (
      <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
        Absent
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      Not marked
    </span>
  );
}

export default function PlayerAttendanceSection({ sessions }) {
  const completed = (sessions || []).filter((s) => s.status === 'completed');
  const withRecord = completed.filter((s) => s.attendance != null);
  const present = withRecord.filter((s) => s.attendance?.present === true).length;
  const absent = withRecord.filter((s) => s.attendance?.present === false).length;
  const rate = withRecord.length ? Math.round((present / withRecord.length) * 100) : null;

  const rows = [...completed]
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
    .slice(0, 20);

  return (
    <PlayerCard className="p-6">
      <h2 className="font-headline text-lg font-bold uppercase tracking-wide text-player-green">Attendance record</h2>
      <p className="mt-1 text-sm text-player-on-variant">Your presence for completed sessions with your coach.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-player-green/20 bg-player-green/5 px-4 py-3 text-center">
          <p className="font-orbitron text-2xl text-player-green">{present}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-player-on-variant">Present</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
          <p className="font-orbitron text-2xl text-red-300">{absent}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-player-on-variant">Absent</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-player-inner/40 px-4 py-3 text-center">
          <p className="font-orbitron text-2xl text-white">{rate != null ? `${rate}%` : '—'}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-player-on-variant">Attendance rate</p>
        </div>
      </div>

      <ul className="mt-6 space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-player-on-variant">No completed sessions yet — records appear after your coach marks attendance.</li>
        ) : (
          rows.map((s) => {
            const coachName = s.coach?.coachProfile?.fullName || s.coach?.email || 'Coach';
            return (
              <li
                key={s._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-player-inner/30 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{coachName}</p>
                  <p className="text-xs text-player-on-variant">
                    {new Date(s.scheduledAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <AttendancePill present={s.attendance?.present} />
              </li>
            );
          })
        )}
      </ul>
    </PlayerCard>
  );
}

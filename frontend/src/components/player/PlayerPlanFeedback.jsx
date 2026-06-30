/** Criteria labels for player plan feedback (mirrors backend PLAYER_SKILL_CRITERIA). */
export const PLAYER_SKILL_CRITERIA = [
  { key: 'urgent', range: 'Below 40%', label: 'Urgent', hint: 'Priority practice required' },
  { key: 'focus', range: '40–59%', label: 'Needs work', hint: 'Focus on improvement this week' },
  { key: 'good', range: '60–69%', label: 'Good', hint: 'Maintain your current level' },
  { key: 'excellent', range: '70%+', label: 'Excellent', hint: 'Strong skill — keep it up' },
];

function SkillChip({ item, variant }) {
  const isImprove = variant === 'improve';
  return (
    <li
      className={`rounded-lg border px-3 py-2 ${
        isImprove
          ? item.level === 'urgent'
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
          : 'border-player-green/30 bg-player-green/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{item.skill}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.category}</p>
        </div>
        <span
          className={`shrink-0 font-orbitron text-base ${
            isImprove ? (item.level === 'urgent' ? 'text-red-300' : 'text-amber-200') : 'text-player-green'
          }`}
        >
          {item.score}%
        </span>
      </div>
      {item.hint ? <p className="mt-1.5 text-sm text-player-on-variant">{item.hint}</p> : null}
      {item.practiceDrill ? (
        <p className="mt-2 rounded-md bg-black/25 px-2 py-1.5 text-sm text-player-green">
          <span className="font-headline text-[10px] uppercase tracking-wider text-slate-500">Practice: </span>
          {item.practiceDrill}
        </p>
      ) : null}
    </li>
  );
}

export default function PlayerPlanFeedback({ insights }) {
  if (!insights) return null;

  const { improveMost = [], doingWell = [], overallAvg, playerMessage } = insights;
  const hasStructured = improveMost.length > 0 || doingWell.length > 0;

  if (!hasStructured && !playerMessage) return null;

  return (
    <div className="mt-4 space-y-4">
      {overallAvg != null ? (
        <p className="text-xs text-player-on-variant">
          Overall skill average: <span className="font-orbitron text-player-green">{overallAvg}%</span>
        </p>
      ) : null}

      {improveMost.length ? (
        <div>
          <p className="font-headline text-sm font-bold uppercase tracking-wide text-amber-200">
            Top priorities to improve
          </p>
          <ul className="mt-2 space-y-2">
            {improveMost.map((item) => (
              <SkillChip key={`imp-${item.skill}`} item={item} variant="improve" />
            ))}
          </ul>
        </div>
      ) : null}

      {doingWell.length ? (
        <div>
          <p className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">
            Going well — maintain
          </p>
          <ul className="mt-2 space-y-2">
            {doingWell.map((item) => (
              <SkillChip key={`ok-${item.skill}`} item={item} variant="strength" />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border border-white/[0.06] bg-player-inner/30 p-3">
        <p className="font-headline text-[10px] font-bold uppercase tracking-wide text-slate-500">Scoring criteria</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {PLAYER_SKILL_CRITERIA.map((c) => (
            <li key={c.key} className="text-[11px] text-player-on-variant">
              <span className="font-medium text-slate-400">{c.range}</span> — {c.label}: {c.hint}
            </li>
          ))}
        </ul>
      </div>

      {playerMessage && !hasStructured ? (
        <pre className="whitespace-pre-wrap text-xs text-player-on-variant">{playerMessage}</pre>
      ) : null}
    </div>
  );
}

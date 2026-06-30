import PlayerCard from './PlayerCard';
import PlayerPlanFeedback from './PlayerPlanFeedback';
import CollapsibleSection from '../shared/CollapsibleSection';
import { isLegacyGenericPlan, parsePlanLines, parseWeeklySchedule, planSourceLabel } from '../../utils/planDisplay';

function Section({ title, children, accent = 'green' }) {
  const border = accent === 'green' ? 'border-player-green/25 bg-player-green/5' : 'border-white/10 bg-player-inner/30';
  return (
    <div className={`mt-5 rounded-xl border p-4 ${border}`}>
      <p className="font-headline text-sm font-bold uppercase tracking-[0.14em] text-player-green">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DayRow({ day, detail }) {
  return (
    <li className="flex gap-4 border-b border-white/5 py-3 last:border-0">
      {day ? (
        <span className="w-20 shrink-0 font-headline text-xs font-bold uppercase tracking-wide text-player-green">
          {day}
        </span>
      ) : null}
      <span className="text-base leading-relaxed text-player-on-surface">{detail}</span>
    </li>
  );
}

export default function PlayerWeeklyPlanCard({ plan }) {
  if (!plan) return null;
  const legacy = isLegacyGenericPlan(plan);
  const schedule = parseWeeklySchedule(plan.exercises);
  const goalLines = parsePlanLines(plan.goals);

  return (
    <PlayerCard className="p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-player-green">
            {planSourceLabel(plan)} · Week of {new Date(plan.weekStartDate).toLocaleDateString()}
          </p>
          <h3 className="mt-2 font-display text-2xl uppercase tracking-wide text-white md:text-3xl">
            {plan.title || 'Weekly training plan'}
          </h3>
        </div>
        <span className="rounded-full border border-player-green/40 bg-player-green/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-player-green">
          Published
        </span>
      </div>

      {legacy ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This is an older plan format. Ask your coach to regenerate from your latest evaluation for a full
          day-by-day program.
        </p>
      ) : null}

      {plan.playerInsights ? (
        <CollapsibleSection title="What to improve & practice" defaultOpen maxHeightClass="max-h-96">
          <PlayerPlanFeedback insights={plan.playerInsights} />
        </CollapsibleSection>
      ) : null}

      {plan.analysisSummary && !legacy ? (
        <CollapsibleSection title="Coach analysis" maxHeightClass="max-h-48">
          <p className="whitespace-pre-wrap text-base leading-relaxed text-player-on-variant">{plan.analysisSummary}</p>
        </CollapsibleSection>
      ) : null}

      {goalLines.length && !legacy ? (
        <CollapsibleSection title="This week's goals" maxHeightClass="max-h-40">
          <ul className="space-y-2">
            {goalLines.map((line) => (
              <li key={line} className="flex gap-2 text-base text-player-on-surface">
                <span className="text-player-green">▸</span>
                <span>{line.replace(/^[-•]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {schedule.length && !legacy ? (
        <CollapsibleSection title="Daily practice program" defaultOpen maxHeightClass="max-h-72">
          <p className="mb-3 text-sm text-player-on-variant">
            Follow each day&apos;s focus — drills are tailored to your weakest skills.
          </p>
          <ul>
            {schedule.map((row, i) => (
              <DayRow key={`${row.day}-${i}`} day={row.day} detail={row.detail} />
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {!schedule.length && plan.exercises && !legacy ? (
        <Section title="Program">
          <pre className="whitespace-pre-wrap text-base leading-relaxed text-player-on-surface">{plan.exercises}</pre>
        </Section>
      ) : null}

      {legacy && plan.goals ? (
        <Section title="Goals">
          <pre className="whitespace-pre-wrap text-sm text-player-on-variant">{plan.goals}</pre>
        </Section>
      ) : null}
    </PlayerCard>
  );
}

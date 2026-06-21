import { Fragment, useEffect, useMemo, useState } from 'react';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import SkillArcRow from '../../components/player/SkillArcRow';
import { playerTableHead, playerTableRow } from '../../components/player/playerClassNames';
import { api, getErrorMessage } from '../../services/api';
import {
  categoryEntries,
  evalOverallScore,
  groupSkillsByCategory,
  sportLabel,
} from '../../utils/evaluationDisplay';

function SkillBreakdown({ evaluation }) {
  const [expanded, setExpanded] = useState(false);
  const byCategory = groupSkillsByCategory(evaluation?.skillScores);
  const categories = categoryEntries(evaluation?.categoryAverages);

  if (!evaluation?.skillScores?.length && !categories.length) {
    return (
      <div className="grid gap-8 md:grid-cols-3">
        <SkillArcRow label="Technique" sub="Precision & control" value={evaluation?.technique} stroke="#00FF87" />
        <SkillArcRow label="Fitness" sub="Stamina & power" value={evaluation?.fitness} stroke="#00B4D8" />
        <SkillArcRow label="Attitude" sub="Mindset & focus" value={evaluation?.attitude} stroke="#A855F7" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SkillArcRow
          label="Overall"
          sub={sportLabel(evaluation.sport)}
          value={evalOverallScore(evaluation)}
          stroke="#00FF87"
        />
        {categories.slice(0, 3).map(([name, value]) => (
          <SkillArcRow key={name} label={name} sub="Category avg" value={value} stroke="#00B4D8" />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 font-headline text-xs uppercase tracking-[0.16em] text-player-green hover:underline"
      >
        <span className="material-symbols-outlined text-base">{expanded ? 'expand_less' : 'expand_more'}</span>
        {expanded ? 'Hide' : 'Show'} all sub-techniques
      </button>

      {expanded ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...byCategory.entries()].map(([category, skills]) => (
            <div key={category} className="rounded-xl border border-white/[0.07] bg-player-inner/30 p-4">
              <p className="font-headline text-xs font-bold uppercase tracking-wide text-player-green">{category}</p>
              <ul className="mt-3 space-y-2">
                {skills.map((row) => (
                  <li key={`${row.category}-${row.skill}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-player-on-variant">{row.skill}</span>
                    <span className="font-orbitron text-player-green">{row.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function PlayerPerformance() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [expandedWeek, setExpandedWeek] = useState(null);

  useEffect(() => {
    api
      .get('/players/performance')
      .then((r) => setRows(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  const latest = useMemo(() => {
    const sorted = [...rows].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    return sorted[0] || null;
  }, [rows]);

  return (
    <div className="space-y-10">
      <PlayerPageHeader title="Performance" subtitle="Sport-specific coach evaluations by week." />
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}

      <PlayerCard className="p-8">
        <h3 className="player-headline-section mb-6 font-headline text-xl font-bold uppercase tracking-tight text-white">
          Latest breakdown
        </h3>
        {latest ? <SkillBreakdown evaluation={latest} /> : (
          <p className="text-sm text-player-on-variant">No evaluations recorded yet.</p>
        )}
      </PlayerCard>

      {rows.length > 1 ? (
        <PlayerCard className="p-6">
          <h3 className="player-headline-section mb-4 font-headline text-xl font-bold uppercase tracking-tight text-white">
            Trend (overall)
          </h3>
          <div className="flex h-32 items-end gap-1">
            {[...rows]
              .sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate))
              .slice(-8)
              .map((r) => {
                const score = evalOverallScore(r) ?? 0;
                return (
                  <div key={r._id} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-player-green/40 to-player-green"
                      style={{ height: `${Math.min(100, score)}%` }}
                      title={`${score}`}
                    />
                    <span className="mt-1 text-[9px] text-player-on-variant">
                      {new Date(r.weekStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
          </div>
        </PlayerCard>
      ) : null}

      <PlayerCard elevate={false} className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className={playerTableHead}>
            <tr>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Overall</th>
              <th className="px-4 py-3">Skills</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overall = evalOverallScore(r);
              const skillCount = r.skillScores?.length || 0;
              const isOpen = expandedWeek === r._id;
              return (
                <Fragment key={r._id}>
                  <tr className={playerTableRow}>
                    <td className="px-4 py-3 text-player-on-surface">
                      {new Date(r.weekStartDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.sport || '—'}</td>
                    <td className="px-4 py-3 font-orbitron text-player-green">{overall ?? '—'}</td>
                    <td className="px-4 py-3">
                      {skillCount ? (
                        <button
                          type="button"
                          onClick={() => setExpandedWeek(isOpen ? null : r._id)}
                          className="text-xs text-player-green hover:underline"
                        >
                          {skillCount} skills {isOpen ? '▲' : '▼'}
                        </button>
                      ) : (
                        <span className="text-player-on-variant">Legacy</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-player-on-variant">{r.comments || '—'}</td>
                  </tr>
                  {isOpen && r.skillScores?.length ? (
                    <tr className="bg-player-inner/20">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {[...groupSkillsByCategory(r.skillScores).entries()].map(([cat, skills]) => (
                            <div key={cat}>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-player-green">{cat}</p>
                              <ul className="mt-1 space-y-1 text-xs text-player-on-variant">
                                {skills.map((s) => (
                                  <li key={`${s.skill}`} className="flex justify-between gap-2">
                                    <span>{s.skill}</span>
                                    <span className="font-orbitron text-white">{s.score}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!rows.length && !err ? (
          <p className="p-6 text-sm text-player-on-variant">No evaluations recorded yet.</p>
        ) : null}
      </PlayerCard>
    </div>
  );
}

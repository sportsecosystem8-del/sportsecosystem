/** Analyze evaluation skillScores and build personalized weekly plan content. */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function priorityForScore(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return 'unknown';
  if (n < 40) return 'critical';
  if (n < 60) return 'needs_work';
  return 'maintain';
}

function priorityLabel(priority) {
  if (priority === 'critical') return 'Needs urgent practice';
  if (priority === 'needs_work') return 'Needs focused work';
  return 'Maintain & refine';
}

/** Sport-specific drill hints keyed by skill name (partial map + generic fallback). */
const DRILL_HINTS = {
  cricket: {
    'Cover drive': 'Front-foot throwdowns (40 balls), head still at contact, mirror batting',
    'Straight drive': 'Straight-bat tee drills, full face to bowler, balance hold',
    'Pull shot': 'Short-ball machine or side-arm feeds, hip rotation, control over power',
    'Yorker': 'Target block at base of stumps, toe-crushing repeat reps',
    'Defensive block': 'Dead-bat defensive sets vs good length, soft hands',
    'Slip catching': 'Reaction catches, first-slip angle, soft hands repeat',
  },
  badminton: {
    Smash: 'Jump timing, racket head speed, steep angle targets',
    'Net kill': 'Fast wrist, tight net tape, kill placement',
    Clear: 'Deep rear court clears, recovery to base after each shot',
  },
};

function drillForSkill(sport, skill) {
  const sportHints = DRILL_HINTS[sport] || {};
  if (sportHints[skill]) return sportHints[skill];
  return `Coach-led reps for "${skill}" — technique correction, then live application`;
}

/**
 * @param {Array<{category:string,skill:string,score:number}>} skillScores
 */
function analyzeSkillGaps(skillScores, sport = 'cricket') {
  const rows = (skillScores || [])
    .filter((r) => r?.skill != null && r?.score != null && r.category !== 'General')
    .map((r) => ({
      category: r.category,
      skill: r.skill,
      score: Math.round(Number(r.score)),
      priority: priorityForScore(r.score),
    }))
    .sort((a, b) => a.score - b.score);

  const critical = rows.filter((r) => r.priority === 'critical');
  const needsWork = rows.filter((r) => r.priority === 'needs_work');
  const maintain = rows.filter((r) => r.priority === 'maintain');
  const strong = [...rows].sort((a, b) => b.score - a.score).slice(0, 5);

  const categoryBuckets = {};
  for (const row of rows) {
    if (!categoryBuckets[row.category]) categoryBuckets[row.category] = [];
    categoryBuckets[row.category].push(row.score);
  }
  const categoryAvgs = Object.fromEntries(
    Object.entries(categoryBuckets).map(([cat, scores]) => [
      cat,
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    ])
  );

  const focusSkills = [...critical, ...needsWork].slice(0, 8);

  return {
    sport,
    allSkills: rows,
    critical,
    needsWork,
    maintain,
    strong,
    focusSkills,
    categoryAvgs,
    overallAvg: rows.length
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : null,
  };
}

function formatSkillLine(row) {
  const label = priorityLabel(row.priority);
  return `• ${row.skill} (${row.score}%) — ${row.category} — ${label}`;
}

function buildWeeklySchedule(focusSkills, sport) {
  if (!focusSkills.length) {
    return ['Maintain current level with mixed sport-specific session + recovery day.'];
  }

  const lines = [];
  const pool = [...focusSkills];
  for (let i = 0; i < DAYS.length; i += 1) {
    const day = DAYS[i];
    if (i === DAYS.length - 1) {
      lines.push(`${day}: Active recovery — mobility, light cardio, video review of weak skills`);
      continue;
    }
    const skill = pool[i % pool.length];
    const drill = drillForSkill(sport, skill.skill);
    lines.push(`${day}: ${skill.skill} focus (${skill.score}% currently) — ${drill}`);
  }
  return lines;
}

/**
 * Rules-based personalized plan when AI is off or fails.
 */
function buildPersonalizedPlanFromGaps({ playerName, sport, gapAnalysis, evaluationDate }) {
  const { critical, needsWork, strong, focusSkills, categoryAvgs, overallAvg } = gapAnalysis;
  const evalLabel = evaluationDate
    ? new Date(evaluationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'latest evaluation';

  const analysisLines = [
    `Skill analysis (from ${evalLabel})`,
    overallAvg != null ? `Overall technique average: ${overallAvg}%` : null,
    '',
    critical.length ? 'Priority — urgent practice needed:' : null,
    ...critical.map(formatSkillLine),
    critical.length && needsWork.length ? '' : null,
    needsWork.length ? 'Focus areas this week:' : null,
    ...needsWork.slice(0, 6).map(formatSkillLine),
    strong.length ? '' : null,
    strong.length ? 'Strengths to maintain:' : null,
    ...strong.slice(0, 3).map((r) => `• ${r.skill} (${r.score}%) — keep sharp with lighter reps`),
  ].filter((line) => line !== null);

  const weakestCategories = Object.entries(categoryAvgs)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3);

  const goalLines = [
    'This week\'s goals',
    ...focusSkills.slice(0, 4).map(
      (r) =>
        `Improve ${r.skill} (currently ${r.score}%) — ${r.priority === 'critical' ? 'primary session focus' : 'secondary focus'}`
    ),
    weakestCategories.length
      ? `Weakest categories: ${weakestCategories.map(([c, v]) => `${c} (${v}%)`).join(', ')}`
      : null,
    `All sessions tailored for ${playerName} (${sport}).`,
  ].filter(Boolean);

  const scheduleLines = ['Weekly program', ...buildWeeklySchedule(focusSkills, sport)];

  return {
    title: `${sport.charAt(0).toUpperCase() + sport.slice(1)} plan — ${playerName} (weak-skill focus)`,
    analysisSummary: analysisLines.join('\n'),
    goals: goalLines.join('\n'),
    exercises: scheduleLines.join('\n'),
    focusSkills: focusSkills.map((r) => ({
      category: r.category,
      skill: r.skill,
      score: r.score,
      priority: r.priority,
    })),
  };
}

function evaluationHasSkillBreakdown(evaluation) {
  return Boolean(
    evaluation &&
      Array.isArray(evaluation.skillScores) &&
      evaluation.skillScores.length > 0 &&
      evaluation.skillScores.some((r) => r.category && r.category !== 'General')
  );
}

/** Scoring criteria shown to players (coach evaluation → plan feedback). */
const PLAYER_SKILL_CRITERIA = {
  urgent: {
    maxScore: 39,
    label: 'Urgent',
    playerHint: 'Priority practice required this week',
  },
  focus: {
    minScore: 40,
    maxScore: 59,
    label: 'Needs work',
    playerHint: 'Focus area — your coach highlighted this for improvement',
  },
  good: {
    minScore: 60,
    maxScore: 69,
    label: 'Good',
    playerHint: 'Solid progress — keep maintaining this skill',
  },
  excellent: {
    minScore: 70,
    label: 'Excellent',
    playerHint: 'Strong performance — this is a key strength',
  },
};

function playerLevelForScore(score) {
  const n = Number(score);
  if (n < 40) return 'urgent';
  if (n < 60) return 'focus';
  if (n < 70) return 'good';
  return 'excellent';
}

/**
 * Player-facing improve vs strengths breakdown + notification text.
 */
function buildPlayerInsights(gapAnalysis) {
  const { critical, needsWork, allSkills, overallAvg, sport } = gapAnalysis;

  const improveMost = [
    ...critical.map((r) => ({
      category: r.category,
      skill: r.skill,
      score: r.score,
      level: 'urgent',
      hint: PLAYER_SKILL_CRITERIA.urgent.playerHint,
      practiceDrill: drillForSkill(sport, r.skill),
    })),
    ...needsWork.map((r) => ({
      category: r.category,
      skill: r.skill,
      score: r.score,
      level: 'focus',
      hint: PLAYER_SKILL_CRITERIA.focus.playerHint,
      practiceDrill: drillForSkill(sport, r.skill),
    })),
  ].slice(0, 8);

  const doingWell = allSkills
    .filter((r) => r.score >= PLAYER_SKILL_CRITERIA.good.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => {
      const level = playerLevelForScore(r.score);
      return {
        category: r.category,
        skill: r.skill,
        score: r.score,
        level: level === 'urgent' || level === 'focus' ? 'good' : level,
        hint:
          level === 'excellent'
            ? PLAYER_SKILL_CRITERIA.excellent.playerHint
            : PLAYER_SKILL_CRITERIA.good.playerHint,
      };
    });

  const improveLines = improveMost.slice(0, 4).map((r) => `${r.skill} (${r.score}%)`);
  const strengthLines = doingWell.slice(0, 3).map((r) => `${r.skill} (${r.score}%)`);

  let notificationBody = '';
  if (improveLines.length) {
    notificationBody += `Priority improve: ${improveLines.join(', ')}. `;
  }
  if (strengthLines.length) {
    notificationBody += `Going well: ${strengthLines.join(', ')}. `;
  }
  notificationBody += 'Open Schedule for your full weekly plan.';
  if (!improveLines.length && !strengthLines.length) {
    notificationBody = 'Your coach published a new weekly training plan. Check Schedule for details.';
  }

  const playerMessage = [
    overallAvg != null ? `Overall skill average: ${overallAvg}% (${sport || 'sport'})` : null,
    '',
    improveMost.length ? '⚠️ Top priorities to improve:' : null,
    ...improveMost.map(
      (r) =>
        `• ${r.skill} — ${r.score}% (${r.level === 'urgent' ? 'urgent' : 'focus'}) — ${r.hint}`
    ),
    doingWell.length ? '' : null,
    doingWell.length ? '✅ Going well — keep it up:' : null,
    ...doingWell.map((r) => `• ${r.skill} — ${r.score}% (${r.level}) — ${r.hint}`),
    '',
    'Criteria: below 40% = urgent · 40–59% = needs work · 60–69% = good · 70%+ = excellent',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return {
    criteria: PLAYER_SKILL_CRITERIA,
    improveMost,
    doingWell,
    overallAvg,
    notificationTitle: 'Weekly plan + skill feedback',
    notificationBody: notificationBody.trim(),
    playerMessage,
  };
}

function planPublishNotification(plan) {
  const ins = plan?.playerInsights;
  if (ins?.notificationBody) {
    return {
      title: ins.notificationTitle || 'Training plan published',
      body: ins.notificationBody,
      category: 'training',
      actionUrl: '/player/training',
    };
  }
  const focus = plan?.focusSkills || [];
  const weak = focus.filter((s) => s.priority === 'critical' || s.priority === 'needs_work').slice(0, 3);
  const body =
    weak.length > 0
      ? `Focus: ${weak.map((s) => `${s.skill} (${s.score}%)`).join(', ')}. See Schedule for full plan.`
      : plan?.title || 'Your coach published a weekly plan.';
  return {
    title: 'Training plan published',
    body,
    category: 'training',
    actionUrl: '/player/training',
  };
}

module.exports = {
  analyzeSkillGaps,
  buildPersonalizedPlanFromGaps,
  buildPlayerInsights,
  planPublishNotification,
  evaluationHasSkillBreakdown,
  priorityForScore,
  priorityLabel,
  PLAYER_SKILL_CRITERIA,
  playerLevelForScore,
};

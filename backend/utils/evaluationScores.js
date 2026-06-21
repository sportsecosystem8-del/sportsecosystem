const GENERAL_CATEGORY = 'General';
const GENERAL_FITNESS_SKILL = 'Fitness / stamina';
const GENERAL_ATTITUDE_SKILL = 'Attitude & coachability';
const FOOTBALL_FITNESS_SKILL = 'Speed / acceleration';
const FOOTBALL_ATTITUDE_SKILL = 'Attitude & communication';

function roundScore(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Math.round(Number(n));
}

function average(nums) {
  const valid = nums.filter((v) => v != null && !Number.isNaN(Number(v)));
  if (!valid.length) return null;
  return roundScore(valid.reduce((s, v) => s + Number(v), 0) / valid.length);
}

/** Build category → average map from skill score rows. */
function computeCategoryAverages(skillScores) {
  const buckets = {};
  for (const row of skillScores || []) {
    if (!row?.category || row.score == null) continue;
    if (!buckets[row.category]) buckets[row.category] = [];
    buckets[row.category].push(Number(row.score));
  }
  const avgs = {};
  for (const [category, scores] of Object.entries(buckets)) {
    avgs[category] = average(scores);
  }
  return avgs;
}

function findSkillScore(skillScores, category, skill) {
  const row = (skillScores || []).find((r) => r.category === category && r.skill === skill);
  return row?.score != null ? roundScore(row.score) : null;
}

/** Derive legacy technique / fitness / attitude + overall from skill rows. */
function deriveLegacyScores(skillScores, sport) {
  const categoryAvgs = computeCategoryAverages(skillScores);
  const sportSkills = (skillScores || []).filter((r) => r.category !== GENERAL_CATEGORY);
  const technique = average(sportSkills.map((r) => r.score));

  let fitness = findSkillScore(skillScores, GENERAL_CATEGORY, GENERAL_FITNESS_SKILL);
  let attitude = findSkillScore(skillScores, GENERAL_CATEGORY, GENERAL_ATTITUDE_SKILL);

  if (sport === 'football') {
    fitness =
      average([
        findSkillScore(skillScores, 'Physical & mental', FOOTBALL_FITNESS_SKILL),
        findSkillScore(skillScores, 'Physical & mental', 'Agility / change of direction'),
        findSkillScore(skillScores, 'Physical & mental', 'Work rate / pressing'),
      ]) ?? fitness;
    attitude = findSkillScore(skillScores, 'Physical & mental', FOOTBALL_ATTITUDE_SKILL) ?? attitude;
  }

  const overallScore = average((skillScores || []).map((r) => r.score));

  return {
    technique: technique ?? overallScore ?? 0,
    fitness: fitness ?? 0,
    attitude: attitude ?? 0,
    overallScore: overallScore ?? technique ?? 0,
    categoryAverages: categoryAvgs,
  };
}

/** Single number for dashboards / rankings — supports old and new records. */
function evaluationSummaryScore(row) {
  if (!row) return null;
  if (row.overallScore != null && !Number.isNaN(Number(row.overallScore))) {
    return roundScore(row.overallScore);
  }
  if (Array.isArray(row.skillScores) && row.skillScores.length) {
    return average(row.skillScores.map((s) => s.score));
  }
  return average([row.technique, row.fitness, row.attitude]);
}

/** Player trend / level signal — prefers overall, falls back to legacy triple. */
function evaluationAverageForTrend(row) {
  if (!row) return 0;
  const summary = evaluationSummaryScore(row);
  if (summary != null) return summary;
  return average([row.technique, row.fitness, row.attitude]) ?? 0;
}

function normalizeSkillScores(rawScores, sport) {
  if (!Array.isArray(rawScores)) return [];
  const rubricSkills = new Set();
  const { getEvaluationRubric } = require('../data/evaluationRubrics');
  const rubric = getEvaluationRubric(sport);
  for (const cat of rubric.categories) {
    for (const skill of cat.skills) {
      rubricSkills.add(`${cat.name}::${skill}`);
    }
  }

  const out = [];
  for (const row of rawScores) {
    const category = String(row?.category || '').trim();
    const skill = String(row?.skill || '').trim();
    const score = roundScore(row?.score);
    if (!category || !skill || score == null) continue;
    if (score < 0 || score > 100) continue;
    if (!rubricSkills.has(`${category}::${skill}`)) continue;
    out.push({ category, skill, score });
  }
  return out;
}

module.exports = {
  computeCategoryAverages,
  deriveLegacyScores,
  evaluationSummaryScore,
  evaluationAverageForTrend,
  normalizeSkillScores,
};

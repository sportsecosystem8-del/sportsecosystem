/** Display helpers for coach/player evaluation views (mirrors backend summary logic). */

export function evalOverallScore(row) {
  if (!row) return null;
  if (row.overallScore != null && !Number.isNaN(Number(row.overallScore))) {
    return Math.round(Number(row.overallScore));
  }
  if (Array.isArray(row.skillScores) && row.skillScores.length) {
    const scores = row.skillScores.map((s) => Number(s.score)).filter((v) => !Number.isNaN(v));
    if (scores.length) return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  const legacy = [row.technique, row.fitness, row.attitude].filter((v) => v != null && !Number.isNaN(Number(v)));
  if (!legacy.length) return null;
  return Math.round(legacy.reduce((a, b) => a + Number(b), 0) / legacy.length);
}

export function groupSkillsByCategory(skillScores) {
  const map = new Map();
  for (const row of skillScores || []) {
    if (!row?.category) continue;
    if (!map.has(row.category)) map.set(row.category, []);
    map.get(row.category).push(row);
  }
  return map;
}

export function categoryEntries(categoryAverages) {
  if (!categoryAverages || typeof categoryAverages !== 'object') return [];
  return Object.entries(categoryAverages)
    .filter(([name]) => name !== 'General')
    .sort(([a], [b]) => a.localeCompare(b));
}

export function sportLabel(sport) {
  if (!sport) return 'Sport';
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

export function defaultScoresFromRubric(rubric, defaultValue = 70) {
  const scores = {};
  if (!rubric?.categories) return scores;
  for (const cat of rubric.categories) {
    for (const skill of cat.skills) {
      scores[`${cat.name}::${skill}`] = defaultValue;
    }
  }
  return scores;
}

export function scoresToPayload(scores) {
  return Object.entries(scores).map(([key, score]) => {
    const [category, ...rest] = key.split('::');
    return { category, skill: rest.join('::'), score: Number(score) };
  });
}

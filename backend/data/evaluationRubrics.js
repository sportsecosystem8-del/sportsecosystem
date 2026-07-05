/** Sport-specific evaluation rubrics — category → deep sub-techniques (0–100 each). */
const EVALUATION_RUBRICS = {
  cricket: {
    sport: 'cricket',
    label: 'Cricket',
    categories: [
      {
        name: 'Batting',
        skills: [
          'Cover drive',
          'Straight drive',
          'On drive',
          'Pull shot',
          'Hook / upper cut',
          'Cut shot',
          'Defensive block',
          'Leave judgment',
          'Footwork (front foot)',
          'Footwork (back foot)',
          'Running between wickets',
          'Power hitting',
          'Playing spin',
          'Playing pace',
        ],
      },
      {
        name: 'Bowling (pace)',
        skills: [
          'Run-up rhythm',
          'Release point',
          'Line (off stump channel)',
          'Good length',
          'Yorker',
          'Bouncer',
          'Outswinger',
          'Inswinger',
          'Slower ball',
          'Follow-through',
        ],
      },
      {
        name: 'Bowling (spin)',
        skills: ['Flight & loop', 'Turn', 'Drift in air', 'Arm ball / slider', 'Accuracy to plan'],
      },
      {
        name: 'Fielding',
        skills: [
          'Slip catching',
          'Outfield catching',
          'Ground fielding (infield)',
          'Throwing (direct hit)',
          'Throwing (relay)',
          'Boundary saving',
        ],
      },
      {
        name: 'Wicket-keeping',
        skills: ['Standing up to spin', 'Standing back to pace', 'Stumping', 'Leg-side takes'],
      },
      {
        name: 'General',
        skills: ['Fitness / stamina', 'Attitude & coachability'],
      },
    ],
  },
  badminton: {
    sport: 'badminton',
    label: 'Badminton',
    categories: [
      {
        name: 'Net play',
        skills: ['Net kill', 'Net drop', 'Net lift defense', 'Spin net shot'],
      },
      {
        name: 'Overhead',
        skills: ['Clear', 'Smash', 'Drop shot', 'Jump smash'],
      },
      {
        name: 'Footwork',
        skills: ['Court coverage', 'Split step', 'Recovery to base', 'Lateral movement'],
      },
      {
        name: 'Serve',
        skills: ['Short serve', 'Flick serve', 'Serve variation'],
      },
      {
        name: 'Doubles play',
        skills: ['Front court rotation', 'Rear court attack', 'Defensive blocks', 'Communication'],
      },
      {
        name: 'General',
        skills: ['Fitness / stamina', 'Attitude & coachability'],
      },
    ],
  },
};

const SUPPORTED_SPORTS = Object.keys(EVALUATION_RUBRICS);

/** Cricket role → rubric category names included in evaluation & plans */
const CRICKET_CATEGORIES_BY_ROLE = {
  batsman: ['Batting', 'Fielding', 'General'],
  bowler: ['Bowling (pace)', 'Bowling (spin)', 'Fielding', 'General'],
  allrounder: ['Batting', 'Bowling (pace)', 'Bowling (spin)', 'Fielding', 'General'],
};

const PLAYER_CATEGORIES = ['batsman', 'bowler', 'allrounder'];

function filterRubricCategories(rubric, playerCategory) {
  if (!rubric || !playerCategory) return rubric;
  const sport = String(rubric.sport || '').toLowerCase();
  if (sport !== 'cricket') return rubric;
  const allowed = CRICKET_CATEGORIES_BY_ROLE[playerCategory];
  if (!allowed) return rubric;
  const allowSet = new Set(allowed);
  return {
    ...rubric,
    playerCategory,
    categories: (rubric.categories || []).filter((c) => allowSet.has(c.name)),
  };
}

function getEvaluationRubric(sport, playerCategory = null) {
  const key = String(sport || '')
    .trim()
    .toLowerCase();
  const base = EVALUATION_RUBRICS[key] || EVALUATION_RUBRICS.cricket;
  return filterRubricCategories(base, playerCategory);
}

function listEvaluationRubrics() {
  return SUPPORTED_SPORTS.map((sport) => EVALUATION_RUBRICS[sport]);
}

module.exports = {
  EVALUATION_RUBRICS,
  SUPPORTED_SPORTS,
  PLAYER_CATEGORIES,
  CRICKET_CATEGORIES_BY_ROLE,
  getEvaluationRubric,
  listEvaluationRubrics,
  filterRubricCategories,
};

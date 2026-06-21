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
  football: {
    sport: 'football',
    label: 'Football',
    categories: [
      {
        name: 'Ball control',
        skills: [
          'First touch (ground)',
          'First touch (aerial)',
          'Dribbling (1v1)',
          'Close control in tight spaces',
          'Weak foot control',
        ],
      },
      {
        name: 'Passing',
        skills: [
          'Short pass accuracy',
          'Long pass / switch play',
          'Through ball',
          'Cross (early / cut-back)',
          'One-touch passing',
        ],
      },
      {
        name: 'Shooting',
        skills: [
          'Power shot',
          'Placement (far / near post)',
          'Volley / half-volley',
          'Weak foot shooting',
          'Heading (attacking)',
        ],
      },
      {
        name: 'Defending',
        skills: [
          'Standing tackle',
          'Slide tackle (timing)',
          '1v1 defending',
          'Aerial duels',
          'Interceptions / reading play',
        ],
      },
      {
        name: 'Goalkeeping',
        skills: ['Shot stopping', 'Cross claiming', 'Distribution (throw / kick)', '1v1 saves'],
      },
      {
        name: 'Physical & mental',
        skills: [
          'Speed / acceleration',
          'Agility / change of direction',
          'Work rate / pressing',
          'Attitude & communication',
        ],
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

function getEvaluationRubric(sport) {
  const key = String(sport || '')
    .trim()
    .toLowerCase();
  return EVALUATION_RUBRICS[key] || EVALUATION_RUBRICS.cricket;
}

function listEvaluationRubrics() {
  return SUPPORTED_SPORTS.map((sport) => EVALUATION_RUBRICS[sport]);
}

module.exports = {
  EVALUATION_RUBRICS,
  SUPPORTED_SPORTS,
  getEvaluationRubric,
  listEvaluationRubrics,
};

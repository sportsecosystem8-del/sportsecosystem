/**
 * Many accepted students for one demo coach — test Evaluation / Sessions picker UI.
 * Run after seed:demo-users (or this script creates missing players).
 * Password for all accounts: Demo1234!
 *
 *   npm run seed:demo-users
 *   npm run seed:coach-students
 *
 * Login as demo-coach1@local.test to see the roster on Performance / Sessions / Plans.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const TrainingRequest = require('../models/TrainingRequest');

const DEMO_PASSWORD = 'Demo1234!';
const COACH_EMAIL = (process.env.SEED_COACH_EMAIL || 'demo-coach1@local.test').toLowerCase();

/** Includes duplicate names on purpose — picker should distinguish by city/email. */
const ROSTER = [
  { email: 'roster-player01@local.test', fullName: 'Ahmed Khan', city: 'Karachi', sportPreference: 'cricket', skillLevel: 'beginner' },
  { email: 'roster-player02@local.test', fullName: 'Ahmed Khan', city: 'Lahore', sportPreference: 'cricket', skillLevel: 'intermediate' },
  { email: 'roster-player03@local.test', fullName: 'Sara Malik', city: 'Lahore', sportPreference: 'badminton', skillLevel: 'intermediate' },
  { email: 'roster-player04@local.test', fullName: 'Hassan Raza', city: 'Islamabad', sportPreference: 'cricket', skillLevel: 'advanced' },
  { email: 'roster-player05@local.test', fullName: 'Fatima Noor', city: 'Karachi', sportPreference: 'badminton', skillLevel: 'beginner' },
  { email: 'roster-player06@local.test', fullName: 'Omar Sheikh', city: 'Multan', sportPreference: 'cricket', skillLevel: 'intermediate' },
  { email: 'roster-player07@local.test', fullName: 'Ali Hassan', city: 'Faisalabad', sportPreference: 'cricket', skillLevel: 'beginner' },
  { email: 'roster-player08@local.test', fullName: 'Ali Hassan', city: 'Rawalpindi', sportPreference: 'cricket', skillLevel: 'advanced' },
  { email: 'roster-player09@local.test', fullName: 'Zainab Ali', city: 'Karachi', sportPreference: 'badminton', skillLevel: 'intermediate' },
  { email: 'roster-player10@local.test', fullName: 'Usman Tariq', city: 'Lahore', sportPreference: 'cricket', skillLevel: 'beginner' },
  { email: 'roster-player11@local.test', fullName: 'Nida Shah', city: 'Islamabad', sportPreference: 'badminton', skillLevel: 'advanced' },
  { email: 'roster-player12@local.test', fullName: 'Bilal Ahmed', city: 'Vehari', sportPreference: 'cricket', skillLevel: 'intermediate' },
  { email: 'roster-player13@local.test', fullName: 'Ayesha Khan', city: 'Karachi', sportPreference: 'badminton', skillLevel: 'beginner' },
  { email: 'roster-player14@local.test', fullName: 'Tariq Mehmood', city: 'Lahore', sportPreference: 'cricket', skillLevel: 'intermediate' },
  { email: 'roster-player15@local.test', fullName: 'Imran Qureshi', city: 'Multan', sportPreference: 'cricket', skillLevel: 'advanced' },
];

async function ensurePlayer(row, passwordHash) {
  const email = row.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      passwordHash,
      role: 'player',
      verificationStatus: 'verified',
      emailVerified: true,
    });
    const pp = await PlayerProfile.create({
      user: user._id,
      fullName: row.fullName,
      phone: `0300${1000000 + Math.floor(Math.random() * 8999999)}`,
      sportPreference: row.sportPreference,
      skillLevel: row.skillLevel,
      city: row.city,
      address: `${row.city} — demo roster`,
    });
    user.playerProfile = pp._id;
    await user.save();
    console.log('Created player:', email, '—', row.fullName);
  }
  return user;
}

async function ensureAcceptedRequest(playerId, coachId) {
  const existing = await TrainingRequest.findOne({ player: playerId, coach: coachId });
  if (existing) {
    if (existing.status !== 'accepted') {
      existing.status = 'accepted';
      await existing.save();
      console.log('  → accepted existing request for player', String(playerId));
    }
    return existing;
  }
  const tr = await TrainingRequest.create({
    player: playerId,
    coach: coachId,
    message: 'Demo roster — accepted for coach UI testing.',
    status: 'accepted',
  });
  console.log('  → new accepted request for player', String(playerId));
  return tr;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const coach = await User.findOne({ email: COACH_EMAIL, role: 'coach' });
  if (!coach) {
    console.error(`Coach not found: ${COACH_EMAIL}. Run: npm run seed:demo-users`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  console.log('Coach roster target:', COACH_EMAIL);
  console.log('Adding', ROSTER.length, 'students with accepted training requests…\n');

  for (const row of ROSTER) {
    const player = await ensurePlayer(row, passwordHash);
    await ensureAcceptedRequest(player._id, coach._id);
  }

  // Also link original demo players to this coach if they exist
  const demoPlayerEmails = [
    'demo-player1@local.test',
    'demo-player2@local.test',
    'demo-player3@local.test',
    'demo-player4@local.test',
    'demo-player5@local.test',
  ];
  const demoPlayers = await User.find({ email: { $in: demoPlayerEmails }, role: 'player' });
  for (const p of demoPlayers) {
    await ensureAcceptedRequest(p._id, coach._id);
  }

  const count = await TrainingRequest.countDocuments({ coach: coach._id, status: 'accepted' });
  await mongoose.disconnect();
  console.log('\nDone.', count, 'accepted student(s) for', COACH_EMAIL);
  console.log('Login coach:', COACH_EMAIL, '| Password:', DEMO_PASSWORD);
  console.log('Open: Coach → Performance Evaluation (scroll the student list).');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

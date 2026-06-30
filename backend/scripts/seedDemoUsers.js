/**
 * Inserts demo players and coaches (idempotent: skips emails that already exist).
 * Demo accounts are email-verified so login works without clicking a mail link.
 * Login password for all seeded accounts: Demo1234!
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const CoachProfile = require('../models/CoachProfile');

const DEMO_PASSWORD = 'Demo1234!';
const MAP_URL = 'https://www.google.com/maps?q=24.8607,67.0011';

const DEMO_EVENING = [
  { dayOfWeek: 1, start: '16:00', end: '20:00' },
  { dayOfWeek: 3, start: '16:00', end: '20:00' },
  { dayOfWeek: 5, start: '16:00', end: '20:00' },
];
const DEMO_PLAYER_SLOTS = [
  { dayOfWeek: 1, start: '17:00', end: '19:00' },
  { dayOfWeek: 3, start: '17:00', end: '19:00' },
];

const players = [
  { email: 'demo-player1@local.test', fullName: 'Ahmed Khan', sportPreference: 'cricket', playerCategory: 'batsman', skillLevel: 'beginner', city: 'Karachi' },
  { email: 'demo-player2@local.test', fullName: 'Sara Malik', sportPreference: 'badminton', skillLevel: 'intermediate', city: 'Lahore' },
  { email: 'demo-player3@local.test', fullName: 'Hassan Raza', sportPreference: 'cricket', playerCategory: 'bowler', skillLevel: 'advanced', city: 'Islamabad' },
  { email: 'demo-player4@local.test', fullName: 'Fatima Noor', sportPreference: 'badminton', skillLevel: 'beginner', city: 'Karachi' },
  { email: 'demo-player5@local.test', fullName: 'Omar Sheikh', sportPreference: 'cricket', playerCategory: 'allrounder', skillLevel: 'intermediate', city: 'Rawalpindi' },
];

const coaches = [
  { email: 'demo-coach1@local.test', fullName: 'Coach Imran', specialties: ['cricket'], city: 'Karachi', yearsExperience: 8, preferredPlayerLevels: ['beginner', 'intermediate'] },
  { email: 'demo-coach2@local.test', fullName: 'Coach Ayesha', specialties: ['badminton'], city: 'Lahore', yearsExperience: 5, preferredPlayerLevels: ['beginner', 'intermediate'] },
  { email: 'demo-coach3@local.test', fullName: 'Coach Bilal', specialties: ['cricket', 'badminton'], city: 'Islamabad', yearsExperience: 12, preferredPlayerLevels: ['intermediate', 'advanced'] },
  { email: 'demo-coach4@local.test', fullName: 'Coach Nida', specialties: ['badminton'], city: 'Karachi', yearsExperience: 4, preferredPlayerLevels: ['beginner'] },
  { email: 'demo-coach5@local.test', fullName: 'Coach Tariq', specialties: ['cricket'], city: 'Lahore', yearsExperience: 15, preferredPlayerLevels: ['intermediate', 'advanced'] },
  { email: 'demo-coach6@local.test', fullName: 'Coach Zainab', specialties: ['cricket'], city: 'Faisalabad', yearsExperience: 6, preferredPlayerLevels: ['beginner', 'intermediate'] },
  { email: 'demo-coach7@local.test', fullName: 'Coach Usman', specialties: ['badminton', 'cricket'], city: 'Multan', yearsExperience: 10, preferredPlayerLevels: ['beginner', 'intermediate', 'advanced'] },
];

async function ensurePlayer(row, passwordHash) {
  const email = row.email.toLowerCase();
  if (await User.findOne({ email })) {
    console.log('Skip player (exists):', email);
    return;
  }
  const user = await User.create({
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
    playerCategory: row.sportPreference === 'cricket' ? row.playerCategory : undefined,
    skillLevel: row.skillLevel,
    trainingPreferences: DEMO_PLAYER_SLOTS,
    city: row.city,
    address: `${row.city} — demo`,
  });
  user.playerProfile = pp._id;
  await user.save();
  console.log('Created player:', email);
}

async function ensureCoach(row, passwordHash) {
  const email = row.email.toLowerCase();
  if (await User.findOne({ email })) {
    console.log('Skip coach (exists):', email);
    return;
  }
  const user = await User.create({
    email,
    passwordHash,
    role: 'coach',
    verificationStatus: 'verified',
    emailVerified: true,
  });
  const renewDemo = new Date();
  renewDemo.setFullYear(renewDemo.getFullYear() + 1);
  const cp = await CoachProfile.create({
    user: user._id,
    fullName: row.fullName,
    phone: `0321${1000000 + Math.floor(Math.random() * 8999999)}`,
    specialties: row.specialties,
    academyLocation: `${row.city} Sports Academy`,
    city: row.city,
    bio: 'Demo coach seeded for testing.',
    yearsExperience: row.yearsExperience,
    preferredPlayerLevels: row.preferredPlayerLevels || [],
    availability: DEMO_EVENING,
    locationMapUrl: MAP_URL,
    platformSubscriptionRenewsAt: renewDemo,
  });
  user.coachProfile = cp._id;
  await user.save();
  console.log('Created coach:', email);
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const row of players) await ensurePlayer(row, passwordHash);
  for (const row of coaches) await ensureCoach(row, passwordHash);

  const demoEmails = [...players, ...coaches].map((row) => row.email.toLowerCase());
  const fixed = await User.updateMany({ email: { $in: demoEmails } }, { $set: { emailVerified: true } });
  if (fixed.modifiedCount > 0) {
    console.log('Updated emailVerified for', fixed.modifiedCount, 'existing demo account(s).');
  }

  const coachDemoEmails = coaches.map((c) => c.email.toLowerCase());
  const coachUserIds = (await User.find({ email: { $in: coachDemoEmails }, role: 'coach' }).select('_id').lean()).map(
    (u) => u._id
  );
  if (coachUserIds.length) {
    const far = new Date();
    far.setFullYear(far.getFullYear() + 1);
    const subFix = await CoachProfile.updateMany(
      { user: { $in: coachUserIds } },
      { $set: { platformSubscriptionRenewsAt: far } }
    );
    if (subFix.modifiedCount > 0) {
      console.log('Updated coach platform subscription window for', subFix.modifiedCount, 'demo profile(s).');
    }
  }

  await mongoose.disconnect();
  console.log('\nDone. Password for all new accounts:', DEMO_PASSWORD);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

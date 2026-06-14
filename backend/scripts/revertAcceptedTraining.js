/**
 * Revert accepted training request(s) — sets status to rejected and removes linked sessions/plans.
 *
 * Usage (from backend/):
 *   node scripts/revertAcceptedTraining.js --yes
 *   node scripts/revertAcceptedTraining.js --yes --coach "Saad Amjad"
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const yes = process.argv.includes('--yes');
const coachArgIdx = process.argv.indexOf('--coach');
const coachNameFilter = coachArgIdx >= 0 ? process.argv[coachArgIdx + 1] : null;

require('../models/User');
require('../models/CoachProfile');
require('../models/PlayerProfile');
require('../models/TrainingRequest');
require('../models/TrainingSession');
require('../models/TrainingPlan');

const User = require('../models/User');
const CoachProfile = require('../models/CoachProfile');
const TrainingRequest = require('../models/TrainingRequest');
const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  let coachIds = null;
  if (coachNameFilter) {
    const profiles = await CoachProfile.find({
      fullName: { $regex: coachNameFilter.trim(), $options: 'i' },
    })
      .select('user fullName')
      .lean();
    coachIds = profiles.map((p) => p.user);
    if (!coachIds.length) {
      console.error(`No coach found matching "${coachNameFilter}"`);
      process.exit(1);
    }
    console.log('Coach filter:', profiles.map((p) => p.fullName).join(', '));
  }

  const query = { status: 'accepted' };
  if (coachIds) query.coach = { $in: coachIds };

  const accepted = await TrainingRequest.find(query)
    .populate('player', 'email')
    .populate({
      path: 'player',
      populate: { path: 'playerProfile', select: 'fullName' },
    })
    .populate('coach', 'email')
    .populate({
      path: 'coach',
      populate: { path: 'coachProfile', select: 'fullName' },
    })
    .lean();

  if (!accepted.length) {
    console.log('No accepted training requests found.');
    await mongoose.disconnect();
    return;
  }

  console.log('Found accepted request(s):');
  for (const r of accepted) {
    console.log(
      `  - ${r._id} | player: ${r.player?.playerProfile?.fullName || r.player?.email} | coach: ${r.coach?.coachProfile?.fullName || r.coach?.email}`
    );
  }

  if (!yes) {
    console.error('\nRe-run with --yes to revert these to rejected and remove linked sessions/plans.');
    process.exit(1);
  }

  for (const r of accepted) {
    const requestId = r._id;
    const sessionResult = await TrainingSession.deleteMany({ trainingRequest: requestId });
    const planResult = await TrainingPlan.deleteMany({
      coach: r.coach._id || r.coach,
      player: r.player._id || r.player,
    });
    await TrainingRequest.updateOne({ _id: requestId }, { $set: { status: 'rejected' } });
    console.log(
      `Reverted ${requestId}: status→rejected, sessions removed: ${sessionResult.deletedCount}, plans removed: ${planResult.deletedCount}`
    );
  }

  await mongoose.disconnect();
  console.log('Done. Refresh the Coach match page in the browser.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

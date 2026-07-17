const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const CoachProfile = require('../models/CoachProfile');
const BusinessProfile = require('../models/BusinessProfile');
const VerificationDocument = require('../models/VerificationDocument');
const Notification = require('../models/Notification');
const TrainingRequest = require('../models/TrainingRequest');
const TrainingSession = require('../models/TrainingSession');
const TrainingPlan = require('../models/TrainingPlan');
const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const AttendanceRecord = require('../models/AttendanceRecord');
const CoachFeedback = require('../models/CoachFeedback');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const GroundBooking = require('../models/GroundBooking');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Product = require('../models/Product');
const IndoorGround = require('../models/IndoorGround');
const Complaint = require('../models/Complaint');
const CoachPartnershipRequest = require('../models/CoachPartnershipRequest');

/**
 * Permanently delete a user and related data so the same email can register again.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {{ allowAdmin?: boolean }} [opts]
 * @returns {Promise<{ email: string, role: string }>}
 */
async function deleteUserAccount(userId, opts = {}) {
  const u = await User.findById(userId);
  if (!u) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  if (u.role === 'admin' && !opts.allowAdmin) {
    const err = new Error('Cannot delete admin account');
    err.statusCode = 403;
    throw err;
  }

  const id = u._id;

  if (u.role === 'coach') {
    await CoachProfile.deleteMany({
      $or: [{ user: id }, ...(u.coachProfile ? [{ _id: u.coachProfile }] : [])],
    });
  } else if (u.role === 'player') {
    await PlayerProfile.deleteMany({
      $or: [{ user: id }, ...(u.playerProfile ? [{ _id: u.playerProfile }] : [])],
    });
  } else if (u.role === 'business_owner') {
    await BusinessProfile.deleteMany({
      $or: [{ user: id }, ...(u.businessProfile ? [{ _id: u.businessProfile }] : [])],
    });
    const grounds = await IndoorGround.find({ businessOwner: id }).select('_id').lean();
    const groundIds = grounds.map((g) => g._id);
    if (groundIds.length) {
      await GroundBooking.deleteMany({ ground: { $in: groundIds } });
      await IndoorGround.deleteMany({ _id: { $in: groundIds } });
    }
    await Product.deleteMany({ businessOwner: id });
  }

  await Promise.all([
    VerificationDocument.deleteMany({ user: id }),
    Notification.deleteMany({ user: id }),
    TrainingRequest.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    TrainingSession.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    TrainingPlan.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    PerformanceEvaluation.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    AttendanceRecord.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    CoachFeedback.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    StudentFeeRecord.deleteMany({ $or: [{ player: id }, { coach: id }] }),
    GroundBooking.deleteMany({ bookedBy: id }),
    Payment.deleteMany({ $or: [{ payer: id }, { payee: id }] }),
    Order.deleteMany({ $or: [{ player: id }, { businessOwner: id }] }),
    Complaint.deleteMany({ $or: [{ filedBy: id }, { againstUser: id }] }),
    CoachPartnershipRequest.deleteMany({ $or: [{ coach: id }, { businessOwner: id }] }),
  ]);

  const email = u.email;
  const role = u.role;
  await u.deleteOne();
  return { email, role };
}

module.exports = { deleteUserAccount };

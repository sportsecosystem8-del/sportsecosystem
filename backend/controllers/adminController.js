const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const PlayerProfile = require('../models/PlayerProfile');
const CoachProfile = require('../models/CoachProfile');
const BusinessProfile = require('../models/BusinessProfile');
const SportCategory = require('../models/SportCategory');
const IndoorGround = require('../models/IndoorGround');
const GroundBooking = require('../models/GroundBooking');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const SystemSettings = require('../models/SystemSettings');
const { parseGroundImagePaths, sanitizeGroundPayload, validateGroundImages } = require('../utils/groundPayload');
const VerificationDocument = require('../models/VerificationDocument');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendVerificationApprovedEmail } = require('../utils/verificationEmails');
const { notifyUser } = require('../utils/notify');
const { streamVerificationDocumentFile } = require('../utils/streamVerificationDocument');
const { isMailerConfigured } = require('../utils/mailer');
const { isStripeEnabled } = require('../utils/stripePayments');

/** Mongoose 8 requires update operators; plain `{ status }` may not persist. */
function verificationDocStatusForAction(action) {
  if (action === 'approve') return 'approved';
  if (action === 'reject') return 'rejected';
  return 'pending';
}

async function setVerificationDocumentsStatus(userId, roleContext, action) {
  const status = verificationDocStatusForAction(action);
  await VerificationDocument.updateMany(
    { user: userId, roleContext },
    { $set: { status } }
  );
}

async function attachVerificationDocuments(users, roleContext) {
  if (!users?.length) return;
  const ids = users.map((u) => u._id);
  const docs = await VerificationDocument.find({ user: { $in: ids }, roleContext })
    .sort({ createdAt: -1 })
    .lean();
  const map = {};
  for (const d of docs) {
    const k = String(d.user);
    if (!map[k]) map[k] = [];
    map[k].push(d);
  }
  for (const u of users) {
    u.verificationDocuments = map[String(u._id)] || [];
  }
}

const dashboard = asyncHandler(async (req, res) => {
  const [players, coaches, businesses, admins] = await Promise.all([
    User.countDocuments({ role: 'player' }),
    User.countDocuments({ role: 'coach' }),
    User.countDocuments({ role: 'business_owner' }),
    User.countDocuments({ role: 'admin' }),
  ]);
  const bookings = await GroundBooking.countDocuments({ status: 'confirmed' });
  const [subscriptionRev, localRev] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'completed', type: 'subscription' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', type: { $in: ['ground_booking', 'product', 'coach_fee'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  /** Dashboard health indicators */
  res.json({
    success: true,
    data: {
      users: { players, coaches, businesses, admins },
      bookingsConfirmed: bookings,
      revenueTotal: (subscriptionRev[0]?.total || 0) + (localRev[0]?.total || 0),
      revenueSubscriptionUsd: subscriptionRev[0]?.total || 0,
      revenueLocalPkr: localRev[0]?.total || 0,
      health: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptimeSec: Math.floor(process.uptime()),
        nodeEnv: process.env.NODE_ENV || 'development',
      },
    },
  });
});

const verificationCoaches = asyncHandler(async (req, res) => {
  const list = await User.find({ role: 'coach', verificationStatus: { $in: ['pending_review', 'more_info'] } })
    .populate('coachProfile')
    .lean();
  await attachVerificationDocuments(list, 'coach');
  res.json({ success: true, data: list });
});

const patchCoachVerification = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const user = await User.findOne({ _id: req.params.userId, role: 'coach' });
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  const audit = { action, adminId: req.user.id, reason, at: new Date() };
  user.verificationAudit.push(audit);
  if (action === 'approve') user.verificationStatus = 'verified';
  else if (action === 'reject') user.verificationStatus = 'rejected';
  else if (action === 'more_info') user.verificationStatus = 'more_info';
  user.verificationNotes = reason;
  await user.save();
  await setVerificationDocumentsStatus(user._id, 'coach', action);
  let title = 'Verification update';
  let body = '';
  if (action === 'approve') {
    body = 'Your coach application was approved. You are now verified.';
  } else if (action === 'reject') {
    body = reason ? `Your coach application was rejected. Reason: ${reason}` : 'Your coach application was rejected.';
  } else if (action === 'more_info') {
    title = 'Additional documents requested';
    body = reason
      ? `Please upload the requested documents in Documents. Admin notes: ${reason}`
      : 'Please upload additional verification documents in the Documents section.';
  }
  await notifyUser(user._id, { title, body, category: 'verification' });
  if (action === 'approve') {
    const profile = await CoachProfile.findOne({ user: user._id }).lean();
    await sendVerificationApprovedEmail({
      email: user.email,
      role: 'coach',
      fullName: profile?.fullName,
    });
  }
  res.json({ success: true, data: user, message: 'User notified in-app.' });
});

const verificationBusiness = asyncHandler(async (req, res) => {
  const list = await User.find({
    role: 'business_owner',
    verificationStatus: { $in: ['pending_review', 'more_info'] },
  })
    .populate('businessProfile')
    .lean();
  await attachVerificationDocuments(list, 'business_owner');
  res.json({ success: true, data: list });
});

/** Admin-only file access (Authorization header); public /uploads should not be relied on for sensitive docs. */
const streamVerificationDocumentFileHandler = asyncHandler(async (req, res) => {
  const doc = await VerificationDocument.findById(req.params.docId).lean();
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  streamVerificationDocumentFile(doc, res);
});

const patchVerificationDocumentStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const doc = await VerificationDocument.findById(req.params.docId);
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  doc.status = status;
  await doc.save();

  const label = doc.originalName || doc.docType || 'Verification document';
  if (status === 'approved') {
    await notifyUser(doc.user, {
      title: 'Document approved',
      body: `Admin approved your document: ${label}.`,
      category: 'verification',
    });
  } else {
    await notifyUser(doc.user, {
      title: 'Document rejected',
      body: reason
        ? `Admin rejected "${label}". Reason: ${reason}`
        : `Admin rejected "${label}". Please upload a corrected file if needed.`,
      category: 'verification',
    });
  }

  res.json({ success: true, data: doc });
});

const patchBusinessVerification = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const user = await User.findOne({ _id: req.params.userId, role: 'business_owner' });
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  user.verificationAudit.push({ action, adminId: req.user.id, reason, at: new Date() });
  if (action === 'approve') user.verificationStatus = 'verified';
  else if (action === 'reject') user.verificationStatus = 'rejected';
  else if (action === 'more_info') user.verificationStatus = 'more_info';
  user.verificationNotes = reason;
  await user.save();
  await setVerificationDocumentsStatus(user._id, 'business_owner', action);
  let title = 'Verification update';
  let body = '';
  if (action === 'approve') {
    body = 'Your business application was approved. You can manage your store.';
  } else if (action === 'reject') {
    body = reason ? `Your business application was rejected. Reason: ${reason}` : 'Your business application was rejected.';
  } else if (action === 'more_info') {
    title = 'Additional documents requested';
    body = reason
      ? `Please upload the requested documents in Documents. Admin notes: ${reason}`
      : 'Please upload additional verification documents in the Documents section.';
  }
  await notifyUser(user._id, { title, body, category: 'verification' });
  if (action === 'approve') {
    const profile = await BusinessProfile.findOne({ user: user._id }).lean();
    await sendVerificationApprovedEmail({
      email: user.email,
      role: 'business_owner',
      fullName: profile?.businessName,
    });
  }
  res.json({ success: true, data: user, message: 'User notified in-app.' });
});

const listUsers = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.email = new RegExp(q, 'i');
  const list = await User.find(filter).select('-passwordHash').limit(200).lean();
  res.json({ success: true, data: list });
});

const patchUser = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === 'admin') return res.status(404).json({ success: false, message: 'Not found' });
  if (req.body.isSuspended !== undefined) u.isSuspended = req.body.isSuspended;
  if (req.body.verificationStatus) u.verificationStatus = req.body.verificationStatus;
  await u.save();
  res.json({ success: true, data: u });
});

const deleteUser = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete' });
  await u.deleteOne();
  res.json({ success: true, message: 'Deleted' });
});

const listCoachesAdmin = asyncHandler(async (req, res) => {
  const list = await User.find({ role: 'coach' }).populate('coachProfile').select('-passwordHash').lean();
  res.json({ success: true, data: list });
});

const listBusinessAdmin = asyncHandler(async (req, res) => {
  const list = await User.find({ role: 'business_owner' })
    .populate('businessProfile')
    .select('-passwordHash')
    .lean();
  res.json({ success: true, data: list });
});

const listSports = asyncHandler(async (req, res) => {
  const list = await SportCategory.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: list });
});

const createSport = asyncHandler(async (req, res) => {
  const slug = (req.body.slug || req.body.name).toLowerCase().replace(/\s+/g, '-');
  const c = await SportCategory.create({ ...req.body, slug });
  res.status(201).json({ success: true, data: c });
});

const updateSport = asyncHandler(async (req, res) => {
  const c = await SportCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: c });
});

const deleteSport = asyncHandler(async (req, res) => {
  await SportCategory.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});

const listGrounds = asyncHandler(async (req, res) => {
  const list = await IndoorGround.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: list });
});

const createGround = asyncHandler(async (req, res) => {
  const required = [
    'name',
    'sportType',
    'ownerName',
    'ownerPhone',
    'ownerAddress',
    'ownerLocation',
    'location',
  ];
  const missing = required.find((key) => !String(req.body?.[key] ?? '').trim());
  if (missing) {
    return res.status(400).json({ success: false, message: `${missing} is required` });
  }
  const imagePaths = parseGroundImagePaths(req.body);
  const imageErr = validateGroundImages(imagePaths);
  if (imageErr) return res.status(400).json({ success: false, message: imageErr });
  const lengthFeet = Number(req.body.lengthFeet);
  const areaSqFt = Number(req.body.areaSqFt);
  if (!Number.isFinite(lengthFeet) || lengthFeet < 1) {
    return res.status(400).json({ success: false, message: 'lengthFeet must be at least 1' });
  }
  if (!Number.isFinite(areaSqFt) || areaSqFt < 1) {
    return res.status(400).json({ success: false, message: 'areaSqFt must be at least 1' });
  }
  const g = await IndoorGround.create(sanitizeGroundPayload(req.body));
  res.status(201).json({ success: true, data: g });
});

const updateGround = asyncHandler(async (req, res) => {
  const payload = sanitizeGroundPayload(req.body);
  if (payload.imagePaths) {
    const imageErr = validateGroundImages(payload.imagePaths);
    if (imageErr) return res.status(400).json({ success: false, message: imageErr });
  }
  const g = await IndoorGround.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!g) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: g });
});

const deleteGround = asyncHandler(async (req, res) => {
  await IndoorGround.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});

const monitorBookings = asyncHandler(async (req, res) => {
  const bookings = await GroundBooking.find()
    .populate('ground')
    .populate('bookedBy', 'email role')
    .sort({ startTime: -1 })
    .limit(200)
    .lean();
  res.json({ success: true, data: { bookings } });
});

const monitorPerformance = asyncHandler(async (req, res) => {
  const mem = process.memoryUsage();
  const [users, bookings, payments] = await Promise.all([
    User.countDocuments(),
    GroundBooking.countDocuments(),
    Payment.countDocuments({ status: 'completed' }),
  ]);
  res.json({
    success: true,
    data: {
      health: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptimeSec: Math.floor(process.uptime()),
        nodeEnv: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryMb: {
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          rss: Math.round(mem.rss / 1024 / 1024),
        },
      },
      services: {
        stripe: isStripeEnabled(),
        mailer: isMailerConfigured(),
      },
      stats: { users, bookings, paymentsCompleted: payments },
    },
  });
});

const listComplaints = asyncHandler(async (req, res) => {
  const list = await Complaint.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: list });
});

const patchComplaint = asyncHandler(async (req, res) => {
  const c = await Complaint.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      handledBy: req.user.id,
    },
    { new: true }
  );
  if (c?.filedBy) {
    await notifyUser(c.filedBy, {
      title: 'Complaint updated',
      body: c.resolution || c.status,
      category: 'complaint',
    });
  }
  res.json({ success: true, data: c });
});

const reportsSummary = asyncHandler(async (req, res) => {
  const byType = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  /** PDF export */
  if (req.query.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="platform-revenue-report.pdf"');
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text('Sports Ecosystem — Payment summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();
    byType.forEach((row) => {
      doc.fontSize(12).text(`${row._id}: ${row.count} transactions, total ${row.total}`);
      doc.moveDown(0.4);
    });
    doc.end();
    return;
  }
  res.json({ success: true, data: { paymentsByType: byType } });
});

/** Admin-provisioned accounts (same roles as public register) */
const createUser = asyncHandler(async (req, res) => {
  const { email, password, role, profile } = req.body;
  if (!email || !password || !role || !profile) {
    return res.status(400).json({ success: false, message: 'email, password, role, profile required' });
  }
  if (!['player', 'coach', 'business_owner'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Cannot create admin via this endpoint' });
  }
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
  const passwordHash = await bcrypt.hash(String(password), 12);
  const verificationStatus = role === 'player' ? 'verified' : 'pending_review';
  const user = await User.create({
    email: String(email).toLowerCase(),
    passwordHash,
    role,
    verificationStatus,
  });
  if (role === 'player') {
    const pp = await PlayerProfile.create({
      user: user._id,
      fullName: profile.fullName || 'Player',
      sportPreference: profile.sportPreference || 'cricket',
      skillLevel: profile.skillLevel || 'beginner',
      city: profile.city,
    });
    user.playerProfile = pp._id;
  } else if (role === 'coach') {
    const mapLink = String(profile.locationMapUrl || '').trim();
    if (!mapLink) {
      return res.status(400).json({
        success: false,
        message: 'locationMapUrl is required for coach accounts',
      });
    }
    const specs = profile.specialties || ['cricket'];
    const cp = await CoachProfile.create({
      user: user._id,
      fullName: profile.fullName || 'Coach',
      specialties: specs,
      city: profile.city,
      academyLocation: profile.academyLocation,
      locationMapUrl: mapLink,
    });
    user.coachProfile = cp._id;
  } else {
    const businessAddress = String(profile.address || '').trim();
    if (!businessAddress) {
      return res.status(400).json({
        success: false,
        message: 'address is required for business accounts',
      });
    }
    const businessMapLink = String(profile.locationMapUrl || '').trim();
    if (!businessMapLink) {
      return res.status(400).json({
        success: false,
        message: 'locationMapUrl is required for business accounts',
      });
    }
    const bp = await BusinessProfile.create({
      user: user._id,
      businessName: profile.businessName || 'Business',
      address: businessAddress,
      storeName: profile.storeName || profile.businessName || 'Store',
      locationMapUrl: businessMapLink,
    });
    user.businessProfile = bp._id;
  }
  await user.save();
  res.status(201).json({
    success: true,
    data: { id: user._id, email: user.email, role: user.role, verificationStatus: user.verificationStatus },
  });
});

const listSubscriptions = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ type: 'subscription', status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ success: true, data: payments });
});

const getSettings = asyncHandler(async (req, res) => {
  const list = await SystemSettings.find().lean();
  res.json({ success: true, data: list });
});

const putSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!Array.isArray(settings)) {
    return res.status(400).json({ success: false, message: 'settings array required' });
  }
  const out = [];
  for (const s of settings) {
    const doc = await SystemSettings.findOneAndUpdate(
      { key: s.key },
      { value: s.value, updatedBy: req.user.id },
      { upsert: true, new: true }
    );
    out.push(doc);
  }
  res.json({ success: true, data: out });
});

module.exports = {
  dashboard,
  createUser,
  verificationCoaches,
  patchCoachVerification,
  verificationBusiness,
  patchBusinessVerification,
  streamVerificationDocumentFile: streamVerificationDocumentFileHandler,
  patchVerificationDocumentStatus,
  listUsers,
  patchUser,
  deleteUser,
  listCoachesAdmin,
  listBusinessAdmin,
  listSports,
  createSport,
  updateSport,
  deleteSport,
  listGrounds,
  createGround,
  updateGround,
  deleteGround,
  monitorBookings,
  monitorPerformance,
  listComplaints,
  patchComplaint,
  reportsSummary,
  listSubscriptions,
  getSettings,
  putSettings,
};

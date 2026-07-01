const mongoose = require('mongoose');
const User = require('../models/User');
const BusinessProfile = require('../models/BusinessProfile');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const VerificationDocument = require('../models/VerificationDocument');
const CoachPartnershipRequest = require('../models/CoachPartnershipRequest');
const IndoorGround = require('../models/IndoorGround');
const GroundBooking = require('../models/GroundBooking');
const { asyncHandler } = require('../utils/asyncHandler');
const { enrichOrderItemsWithImages } = require('../utils/productImages');
const { notifyUser } = require('../utils/notify');
const {
  parseGroundImagePaths,
  sanitizeGroundPayload,
  validateGroundImages,
} = require('../utils/groundPayload');
const {
  getStripe,
  isStripeEnabled,
  dollarsToCents,
  retrieveSucceededPaymentIntent,
  assertAmountMatches,
  paymentIntentMethodSpec,
} = require('../utils/stripePayments');

/** Monthly USD price per subscription tier */
function subscriptionPriceUsd(pkg) {
  if (pkg === 'premium') return 99;
  if (pkg === 'pro') return 49;
  return 19;
}

async function verifyBusinessSubscriptionPI(paymentIntentId, userId, action, pkg, amountUsd) {
  const pi = await retrieveSucceededPaymentIntent(paymentIntentId);
  if (pi.metadata.purpose !== 'business_subscription' || pi.metadata.userId !== String(userId)) {
    const err = new Error('Invalid payment');
    err.statusCode = 400;
    throw err;
  }
  if (pi.metadata.action !== action) {
    const err = new Error('Invalid payment action');
    err.statusCode = 400;
    throw err;
  }
  if (pi.metadata.package !== pkg) {
    const err = new Error('Invalid package for this payment');
    err.statusCode = 400;
    throw err;
  }
  assertAmountMatches(pi, dollarsToCents(amountUsd));
}

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('businessProfile');
  if (!user.businessProfile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: user.businessProfile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const bp = await BusinessProfile.findOneAndUpdate({ user: req.user.id }, req.body, { new: true });
  res.json({ success: true, data: bp });
});

const createSubscriptionPaymentIntent = asyncHandler(async (req, res) => {
  if (!isStripeEnabled()) {
    return res.status(503).json({ success: false, message: 'Stripe is not configured on the server.' });
  }
  const { action, package: pkg } = req.body;
  const userId = req.user.id;
  let amountUsd;
  let metaPkg;
  if (action === 'subscribe') {
    if (!pkg || !['basic', 'pro', 'premium'].includes(pkg)) {
      return res.status(400).json({ success: false, message: 'package is required for subscribe' });
    }
    amountUsd = subscriptionPriceUsd(pkg);
    metaPkg = pkg;
  } else if (action === 'renew') {
    const bp = await BusinessProfile.findOne({ user: userId });
    if (!bp) return res.status(404).json({ success: false, message: 'Profile not found' });
    if (!bp.hasActiveSubscription()) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription to renew. Choose a plan first.',
      });
    }
    metaPkg = bp.subscriptionPackage;
    amountUsd = subscriptionPriceUsd(bp.subscriptionPackage);
  } else if (action === 'change') {
    if (!pkg || !['basic', 'pro', 'premium'].includes(pkg)) {
      return res.status(400).json({ success: false, message: 'package is required for change' });
    }
    const bp = await BusinessProfile.findOne({ user: userId });
    if (!bp) return res.status(404).json({ success: false, message: 'Profile not found' });
    if (!bp.hasActiveSubscription()) {
      return res.status(400).json({
        success: false,
        message: 'Subscribe to a plan before changing tiers.',
      });
    }
    const count = await Product.countDocuments({ businessOwner: userId, isActive: true });
    const limit = BusinessProfile.packageLimit(pkg);
    if (count > limit) {
      return res.status(400).json({
        success: false,
        message: `Cannot switch to ${pkg}: you have ${count} active listings but this plan allows ${limit}.`,
      });
    }
    amountUsd = subscriptionPriceUsd(pkg);
    metaPkg = pkg;
  } else {
    return res.status(400).json({ success: false, message: 'action must be subscribe, renew, or change' });
  }
  const amountCents = dollarsToCents(amountUsd);
  if (amountCents < 50) {
    return res.status(400).json({ success: false, message: 'Amount below minimum charge' });
  }
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    ...paymentIntentMethodSpec(),
    metadata: {
      purpose: 'business_subscription',
      action,
      userId: String(userId),
      package: metaPkg,
      amountCents: String(amountCents),
    },
  });
  res.json({
    success: true,
    data: {
      clientSecret: pi.client_secret,
      amount: amountUsd,
      action,
      package: metaPkg,
      currency: 'usd',
    },
  });
});

const subscribe = asyncHandler(async (req, res) => {
  const { package: pkg, paymentIntentId } = req.body;
  const amountUsd = subscriptionPriceUsd(pkg);
  const limit = BusinessProfile.packageLimit(pkg);
  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required. Pay with Stripe first.' });
    }
    try {
      await verifyBusinessSubscriptionPI(paymentIntentId, req.user.id, 'subscribe', pkg, amountUsd);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }
  }
  const payment = await Payment.create({
    payer: req.user.id,
    type: 'subscription',
    amount: amountUsd,
    status: 'completed',
    externalRef: isStripeEnabled() ? paymentIntentId : 'mock-gateway',
    meta: {
      package: pkg,
      cardLast4: req.body.cardLast4 || 'mock',
      invoiceRef: `SUB-${Date.now()}`,
    },
  });
  const renew = new Date();
  renew.setMonth(renew.getMonth() + 1);
  const activeCount = await Product.countDocuments({ businessOwner: req.user.id, isActive: true });
  const bp = await BusinessProfile.findOneAndUpdate(
    { user: req.user.id },
    {
      subscriptionPackage: pkg,
      listingSlotsRemaining: Math.max(0, limit - activeCount),
      subscriptionRenewsAt: renew,
    },
    { new: true }
  );
  await notifyUser(req.user.id, {
    title: 'Subscription active',
    body: `Package ${pkg} — ${limit} listing slots`,
    category: 'subscription',
  });
  res.json({ success: true, data: { profile: bp, payment } });
});

const renewSubscription = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;
  const bp = await BusinessProfile.findOne({ user: req.user.id });
  if (!bp) return res.status(404).json({ success: false, message: 'Profile not found' });
  if (!bp.hasActiveSubscription()) {
    return res.status(400).json({
      success: false,
      message: 'No active subscription to renew. Choose a plan first.',
    });
  }
  const pkg = bp.subscriptionPackage;
  const amountUsd = subscriptionPriceUsd(pkg);
  const limit = BusinessProfile.packageLimit(bp.subscriptionPackage);
  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required. Pay with Stripe first.' });
    }
    try {
      await verifyBusinessSubscriptionPI(paymentIntentId, req.user.id, 'renew', pkg, amountUsd);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }
  }
  const payment = await Payment.create({
    payer: req.user.id,
    type: 'subscription',
    amount: amountUsd,
    status: 'completed',
    externalRef: isStripeEnabled() ? paymentIntentId : 'mock-gateway-renewal',
  });
  const renew = new Date();
  renew.setMonth(renew.getMonth() + 1);
  const activeCount = await Product.countDocuments({ businessOwner: req.user.id, isActive: true });
  bp.listingSlotsRemaining = Math.max(0, limit - activeCount);
  bp.subscriptionRenewsAt = renew;
  await bp.save();
  res.json({ success: true, data: { profile: bp, payment } });
});

const updateStore = asyncHandler(async (req, res) => {
  /** Store branding & policies */
  const allowed = [
    'storeName',
    'storeDescription',
    'storeLogoUrl',
    'storeBannerUrl',
    'shippingPolicyText',
    'returnPolicyText',
  ];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  const bp = await BusinessProfile.findOneAndUpdate({ user: req.user.id }, patch, { new: true });
  res.json({ success: true, data: bp });
});

/** Change subscription tier with downgrade guard */
const changeSubscription = asyncHandler(async (req, res) => {
  const { package: pkg, paymentIntentId } = req.body;
  const bpExisting = await BusinessProfile.findOne({ user: req.user.id });
  if (!bpExisting) return res.status(404).json({ success: false, message: 'Profile not found' });
  if (!bpExisting.hasActiveSubscription()) {
    return res.status(400).json({
      success: false,
      message: 'Subscribe to a plan before changing tiers.',
    });
  }
  const amountUsd = subscriptionPriceUsd(pkg);
  const count = await Product.countDocuments({ businessOwner: req.user.id, isActive: true });
  const limit = BusinessProfile.packageLimit(pkg);
  if (count > limit) {
    return res.status(400).json({
      success: false,
      message: `Cannot switch to ${pkg}: you have ${count} active listings but this plan allows ${limit}. Remove products first.`,
    });
  }
  if (isStripeEnabled()) {
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required. Pay with Stripe first.' });
    }
    try {
      await verifyBusinessSubscriptionPI(paymentIntentId, req.user.id, 'change', pkg, amountUsd);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }
  }
  const payment = await Payment.create({
    payer: req.user.id,
    type: 'subscription',
    amount: amountUsd,
    status: 'completed',
    externalRef: isStripeEnabled() ? paymentIntentId : 'mock-gateway-plan-change',
    meta: { package: pkg, cardLast4: req.body.cardLast4 || 'mock', invoiceRef: `SUB-CHG-${Date.now()}` },
  });
  const renew = new Date();
  renew.setMonth(renew.getMonth() + 1);
  const bp = await BusinessProfile.findOneAndUpdate(
    { user: req.user.id },
    {
      subscriptionPackage: pkg,
      listingSlotsRemaining: limit - count,
      subscriptionRenewsAt: renew,
    },
    { new: true }
  );
  await notifyUser(req.user.id, {
    title: 'Subscription updated',
    body: `Your plan is now ${pkg}.`,
    category: 'subscription',
  });
  res.json({ success: true, data: { profile: bp, payment } });
});

const assertVerifiedAndQuota = async (userId) => {
  const u = await User.findById(userId);
  if (u.verificationStatus !== 'verified') {
    const err = new Error('Your business must be approved by admin before adding products.');
    err.statusCode = 403;
    throw err;
  }
  const bp = await BusinessProfile.findOne({ user: userId });
  if (bp.listingSlotsRemaining <= 0) {
    const onFreeTrial = !bp.hasActiveSubscription();
    const err = new Error(
      onFreeTrial
        ? 'Your 10 free listings are used up. Purchase Basic, Pro, or Premium to list more products.'
        : 'No listing slots available. Purchase or renew a subscription package first.'
    );
    err.statusCode = 403;
    throw err;
  }
  return bp;
};

const listMyProducts = asyncHandler(async (req, res) => {
  const list = await Product.find({ businessOwner: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: list });
});

const addProduct = asyncHandler(async (req, res) => {
  await assertVerifiedAndQuota(req.user.id);
  const images = Array.isArray(req.body.images)
    ? req.body.images.map((u) => String(u).trim()).filter(Boolean)
    : [];
  if (images.length < 1) {
    return res.status(400).json({ success: false, message: 'At least one product image is required' });
  }
  const bp = await BusinessProfile.findOne({ user: req.user.id });
  const product = await Product.create({ ...req.body, images, businessOwner: req.user.id });
  bp.listingSlotsRemaining -= 1;
  await bp.save();
  res.status(201).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body.businessOwner;
  delete body.changeLog;
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  const p = await Product.findOneAndUpdate(
    { _id: req.params.id, businessOwner: req.user.id },
    {
      $set: body,
      $push: { changeLog: { note: 'Product updated', at: new Date() } },
    },
    { new: true }
  );
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, businessOwner: req.user.id });
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  /** Block delete when open orders reference product */
  const openOrder = await Order.findOne({
    businessOwner: req.user.id,
    status: { $in: ['pending', 'paid', 'processing', 'shipped'] },
    'items.product': p._id,
  }).lean();
  if (openOrder) {
    return res.status(409).json({
      success: false,
      message: 'Product has active orders — fulfill or cancel them first, or mark out of stock.',
    });
  }
  await p.deleteOne();
  const bp = await BusinessProfile.findOne({ user: req.user.id });
  if (bp.hasActiveSubscription()) {
    bp.listingSlotsRemaining += 1;
  } else {
    const cap = bp.freeTrialListingsGranted ?? BusinessProfile.FREE_TRIAL_LISTINGS;
    bp.listingSlotsRemaining = Math.min((bp.listingSlotsRemaining || 0) + 1, cap);
  }
  await bp.save();
  res.json({ success: true, message: 'Deleted' });
});

const patchPricing = asyncHandler(async (req, res) => {
  const p = await Product.findOneAndUpdate(
    { _id: req.params.id, businessOwner: req.user.id },
    { price: req.body.price },
    { new: true }
  );
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
});

const patchStock = asyncHandler(async (req, res) => {
  const update = { stock: req.body.stock };
  if (req.body.lowStockThreshold != null) update.lowStockThreshold = req.body.lowStockThreshold;
  const p = await Product.findOneAndUpdate({ _id: req.params.id, businessOwner: req.user.id }, update, {
    new: true,
  });
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  /** Stock update */
  const th = p.lowStockThreshold ?? 5;
  if (p.stock <= th) {
    await notifyUser(req.user.id, {
      title: 'Low stock alert',
      body: `${p.name} is at or below threshold (${th}).`,
      category: 'inventory',
    });
  }
  res.json({ success: true, data: p });
});

const addProductImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Image required' });
  const url = `/uploads/${req.file.filename}`;
  const p = await Product.findOneAndUpdate(
    { _id: req.params.id, businessOwner: req.user.id },
    { $push: { images: url } },
    { new: true }
  );
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
});

const listOrders = asyncHandler(async (req, res) => {
  const list = await Order.find({ businessOwner: req.user.id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'player',
      select: 'email createdAt',
      populate: {
        path: 'playerProfile',
        select: 'fullName phone sportPreference skillLevel city address',
      },
    })
    .lean();
  const data = await enrichOrderItemsWithImages(list, Product);
  res.json({ success: true, data });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  if (req.body.status == null && req.body.trackingNumber === undefined) {
    return res.status(400).json({ success: false, message: 'Provide status and/or trackingNumber' });
  }
  const patch = {};
  if (req.body.status) patch.status = req.body.status;
  if (req.body.trackingNumber !== undefined) patch.trackingNumber = req.body.trackingNumber;
  const o = await Order.findOne({ _id: req.params.id, businessOwner: req.user.id });
  if (!o) return res.status(404).json({ success: false, message: 'Not found' });
  if (patch.status) o.status = patch.status;
  if (patch.trackingNumber !== undefined) o.trackingNumber = patch.trackingNumber;
  await o.save();

  if (req.body.status === 'completed' && o.paymentMethod === 'cod' && o.payment) {
    await Payment.findByIdAndUpdate(o.payment, { status: 'completed' });
  }

  const msg =
    patch.trackingNumber != null
      ? `Order ${o.status}. Tracking: ${patch.trackingNumber}`
      : `Your order is now: ${o.status}`;
  await notifyUser(o.player, {
    title: 'Order update',
    body: msg,
    category: 'order',
  });
  res.json({ success: true, data: o });
});

function escapeCsvCell(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Sales analytics; optional CSV export */
const salesReport = asyncHandler(async (req, res) => {
  const filter = { businessOwner: req.user.id, status: { $ne: 'cancelled' } };
  if (req.query.from) filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.from) };
  if (req.query.to) filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.to) };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
  const total = orders.reduce((s, o) => s + o.totalAmount, 0);
  const popularMatch = {
    businessOwner: new mongoose.Types.ObjectId(req.user.id),
    status: { $ne: 'cancelled' },
  };
  if (req.query.from) popularMatch.createdAt = { ...popularMatch.createdAt, $gte: new Date(req.query.from) };
  if (req.query.to) popularMatch.createdAt = { ...popularMatch.createdAt, $lte: new Date(req.query.to) };
  const popular = await Order.aggregate([
    { $match: popularMatch },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        qty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: 10 },
  ]);
  if (req.query.format === 'csv') {
    const header = ['orderId', 'status', 'totalAmount', 'createdAt'].map(escapeCsvCell).join(',');
    const lines = orders.map((o) =>
      [o._id, o.status, o.totalAmount, new Date(o.createdAt).toISOString()].map(escapeCsvCell).join(',')
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
    return res.send(`${header}\n${lines.join('\n')}`);
  }
  res.json({
    success: true,
    data: {
      orderCount: orders.length,
      revenue: total,
      popularProducts: popular,
      orders,
    },
  });
});

const listCoachesDirectory = asyncHandler(async (req, res) => {
  const coaches = await User.find({ role: 'coach', verificationStatus: 'verified', isSuspended: false })
    .populate('coachProfile')
    .lean();
  res.json({ success: true, data: coaches });
});

const sendPartnership = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const coachId = req.params.coachId;
  const coach = await User.findOne({ _id: coachId, role: 'coach' });
  if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });
  const pr = await CoachPartnershipRequest.create({
    businessOwner: req.user.id,
    coach: coachId,
    message,
  });
  await notifyUser(coachId, {
    title: 'Partnership request',
    body: message,
    category: 'partnership',
  });
  res.status(201).json({ success: true, data: pr });
});

const listNotifications = asyncHandler(async (req, res) => {
  const list = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: list });
});

const uploadBusinessDoc = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  const doc = await VerificationDocument.create({
    user: req.user.id,
    roleContext: 'business_owner',
    filePath: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    docType: req.body.docType,
    issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
    expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
    status: 'pending',
  });
  const user = await User.findById(req.user.id);
  user.verificationStatus = 'pending_review';
  await user.save();
  res.status(201).json({ success: true, data: doc });
});

const listBusinessDocs = asyncHandler(async (req, res) => {
  const list = await VerificationDocument.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: list });
});

const listMyGrounds = asyncHandler(async (req, res) => {
  const list = await IndoorGround.find({ businessOwner: req.user.id }).sort({ name: 1 }).lean();
  res.json({ success: true, data: list });
});

const createBusinessGround = asyncHandler(async (req, res) => {
  const owner = await User.findById(req.user.id).lean();
  if (!owner) return res.status(404).json({ success: false, message: 'User not found' });
  if (owner.verificationStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Your business must be approved by admin before listing grounds.',
    });
  }
  const bp = await BusinessProfile.findOne({ user: req.user.id }).lean();
  if (!bp) return res.status(404).json({ success: false, message: 'Business profile not found' });

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
  if (!req.body.name || !req.body.sportType) {
    return res.status(400).json({ success: false, message: 'name and sportType are required' });
  }

  const payload = sanitizeGroundPayload({
    ...req.body,
    ownerName: req.body.ownerName || bp.businessName,
    ownerPhone: req.body.ownerPhone || bp.phone || '',
    ownerAddress: req.body.ownerAddress || bp.address,
    ownerLocation: req.body.ownerLocation || bp.address,
    location: req.body.location || bp.address,
    city: req.body.city || '',
    businessOwner: req.user.id,
    listedBy: 'business_owner',
    isActive: true,
  });

  const g = await IndoorGround.create(payload);
  res.status(201).json({ success: true, data: g });
});

const updateBusinessGround = asyncHandler(async (req, res) => {
  const existing = await IndoorGround.findOne({ _id: req.params.id, businessOwner: req.user.id });
  if (!existing) return res.status(404).json({ success: false, message: 'Ground not found' });
  const payload = sanitizeGroundPayload(req.body);
  if (payload.imagePaths) {
    const imageErr = validateGroundImages(payload.imagePaths);
    if (imageErr) return res.status(400).json({ success: false, message: imageErr });
  }
  const g = await IndoorGround.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  res.json({ success: true, data: g });
});

const deleteBusinessGround = asyncHandler(async (req, res) => {
  const g = await IndoorGround.findOneAndDelete({ _id: req.params.id, businessOwner: req.user.id });
  if (!g) return res.status(404).json({ success: false, message: 'Ground not found' });
  res.json({ success: true, message: 'Ground removed' });
});

const listBusinessGroundBookings = asyncHandler(async (req, res) => {
  const groundIds = await IndoorGround.find({ businessOwner: req.user.id }).distinct('_id');
  const list = await GroundBooking.find({
    ground: { $in: groundIds },
    status: { $in: ['held', 'confirmed'] },
  })
    .populate('ground', 'name sportType city location address pricePerHour openTime closeTime')
    .sort({ startTime: -1 })
    .lean();
  res.json({ success: true, data: list });
});

module.exports = {
  getProfile,
  updateProfile,
  createSubscriptionPaymentIntent,
  subscribe,
  renewSubscription,
  changeSubscription,
  updateStore,
  listMyProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  patchPricing,
  patchStock,
  addProductImage,
  listOrders,
  updateOrderStatus,
  salesReport,
  listCoachesDirectory,
  sendPartnership,
  listNotifications,
  uploadBusinessDoc,
  listBusinessDocs,
  listMyGrounds,
  createBusinessGround,
  updateBusinessGround,
  deleteBusinessGround,
  listBusinessGroundBookings,
};

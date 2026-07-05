const IndoorGround = require('../models/IndoorGround');
const Product = require('../models/Product');
const { asyncHandler } = require('../utils/asyncHandler');
const { verifiedBusinessOwnerIds } = require('../utils/verifiedSellers');
const { hasOverlap } = require('../utils/groundBookings');
const { slotsForGroundOnDay, findNearestAvailableSlot } = require('../utils/groundSlots');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const listGrounds = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  const { sport, city, location, minPrice, maxPrice, availableStart, availableEnd } = req.query;

  if (sport) filter.sportType = String(sport).toLowerCase();
  if (city) filter.city = new RegExp(String(city).trim(), 'i');
  if (location) {
    const loc = String(location).trim();
    filter.$or = [
      { city: new RegExp(loc, 'i') },
      { location: new RegExp(loc, 'i') },
      { address: new RegExp(loc, 'i') },
      { ownerLocation: new RegExp(loc, 'i') },
    ];
  }
  const min = minPrice != null && minPrice !== '' ? Number(minPrice) : null;
  const max = maxPrice != null && maxPrice !== '' ? Number(maxPrice) : null;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.pricePerHour = {};
    if (Number.isFinite(min)) filter.pricePerHour.$gte = min;
    if (Number.isFinite(max)) filter.pricePerHour.$lte = max;
  }

  let list = await IndoorGround.find(filter).sort({ pricePerHour: 1, name: 1 }).lean();

  if (availableStart && availableEnd) {
    const start = new Date(availableStart);
    const end = new Date(availableEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
      const availableOnly = [];
      for (const ground of list) {
        const taken = await hasOverlap(ground._id, start, end);
        if (!taken) availableOnly.push(ground);
      }
      list = availableOnly;
    }
  }

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 48, maxLimit: 100 });
  const total = list.length;
  const data = list.slice(skip, skip + limit);

  res.json({
    success: true,
    data,
    pagination: paginationMeta({ page, limit, total }),
  });
});

/** Query: startTime, endTime (ISO). Returns whether interval is free of held/confirmed bookings. */
const checkGroundSlotAvailability = asyncHandler(async (req, res) => {
  const ground = await IndoorGround.findOne({ _id: req.params.groundId, isActive: true }).lean();
  if (!ground) return res.status(404).json({ success: false, message: 'Ground not found' });
  const start = new Date(req.query.startTime);
  const end = new Date(req.query.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({
      success: false,
      message: 'Query params startTime and endTime (ISO strings) are required',
    });
  }
  const overlap = await hasOverlap(ground._id, start, end);
  res.json({
    success: true,
    data: {
      available: !overlap,
      slotDurationMinutes: ground.slotDurationMinutes,
      openTime: ground.openTime,
      closeTime: ground.closeTime,
      pricePerHour: ground.pricePerHour,
    },
  });
});

/** Day slots with availability — query: date=YYYY-MM-DD */
const listGroundDaySlots = asyncHandler(async (req, res) => {
  const ground = await IndoorGround.findOne({ _id: req.params.groundId, isActive: true }).lean();
  if (!ground) return res.status(404).json({ success: false, message: 'Ground not found' });
  const date = req.query.date;
  if (!date) {
    return res.status(400).json({ success: false, message: 'Query param date (YYYY-MM-DD) is required' });
  }
  const slots = await slotsForGroundOnDay(ground, date);
  const preferStart = req.query.preferStart;
  const nearestAvailable =
    preferStart && String(preferStart).trim()
      ? findNearestAvailableSlot(slots, String(preferStart).trim())
      : null;
  res.json({
    success: true,
    data: {
      groundId: ground._id,
      date,
      slotDurationMinutes: ground.slotDurationMinutes,
      openTime: ground.openTime,
      closeTime: ground.closeTime,
      pricePerHour: ground.pricePerHour,
      slots,
      nearestAvailable,
    },
  });
});

const listProducts = asyncHandler(async (req, res) => {
  const ownerIds = await verifiedBusinessOwnerIds();
  const filter = {
    isActive: true,
    businessOwner: { $in: ownerIds },
  };
  if (req.query.sport) {
    const s = String(req.query.sport).toLowerCase();
    if (s === 'cricket' || s === 'badminton') {
      filter.sportType = { $in: [s, 'general'] };
    } else {
      filter.sportType = s;
    }
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 48, maxLimit: 100 });
  const [list, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: list,
    pagination: paginationMeta({ page, limit, total }),
  });
});

module.exports = { listGrounds, checkGroundSlotAvailability, listGroundDaySlots, listProducts };

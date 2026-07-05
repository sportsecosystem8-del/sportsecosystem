const GroundBooking = require('../models/GroundBooking');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { runWithOptionalTransaction } = require('./mongoTransaction');
const { generateBookingToken } = require('./groundSlots');

async function findActiveOverlap(groundId, start, end, excludeId, session) {
  const now = new Date();
  const filter = {
    ground: groundId,
    startTime: { $lt: end },
    endTime: { $gt: start },
    $or: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { $gt: now } }],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  let q = GroundBooking.findOne(filter).select('_id');
  if (session) q = q.session(session);
  return q.lean();
}

/**
 * Atomically confirm a held ground booking after payment verification.
 */
async function finalizeGroundBookingConfirm({
  booking,
  paymentId,
  txnLabel,
  guestName,
  guestPhone,
  guestAddress,
  guestCity,
  paymentNote,
}) {
  const groundId = booking.ground?._id || booking.ground;
  const start = booking.startTime;
  const end = booking.endTime;

  return runWithOptionalTransaction(async (session) => {
    const overlap = await findActiveOverlap(groundId, start, end, booking._id, session);
    if (overlap) {
      const err = new Error('Slot no longer available');
      err.statusCode = 409;
      throw err;
    }

    const holdFilter = {
      _id: booking._id,
      status: 'held',
      holdExpiresAt: { $gt: new Date() },
    };
    let holdQ = GroundBooking.findOne(holdFilter);
    if (session) holdQ = holdQ.session(session);
    const held = await holdQ;
    if (!held) {
      const err = new Error('Hold not found or expired');
      err.statusCode = 410;
      throw err;
    }

    held.payment = paymentId;
    held.status = 'confirmed';
    held.holdExpiresAt = undefined;
    held.confirmationToken = generateBookingToken();
    held.guestName = guestName;
    held.guestPhone = guestPhone;
    held.guestAddress = guestAddress;
    held.guestCity = guestCity;
    held.paymentNote = paymentNote;
    await held.save(session ? { session } : undefined);
    return held;
  });
}

/**
 * Atomically decrement stock and create a paid order.
 */
async function finalizeProductOrder({
  payerId,
  ownerId,
  items,
  lineDocs,
  total,
  paymentId,
  shippingAddress,
  customerNote,
}) {
  return runWithOptionalTransaction(async (session) => {
    const stockUpdates = [];
    for (const line of items) {
      const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
      let q = Product.findOneAndUpdate(
        { _id: line.productId, isActive: true, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (session) q = q.session(session);
      const updated = await q;
      if (!updated) {
        const err = new Error(`Insufficient stock for a product in your cart`);
        err.statusCode = 409;
        throw err;
      }
      stockUpdates.push(updated);
    }

    const orderPayload = {
      player: payerId,
      businessOwner: ownerId,
      items: lineDocs,
      totalAmount: total,
      status: 'paid',
      paymentMethod: 'easypaisa',
      payment: paymentId,
      shippingAddress,
      customerNote: customerNote || undefined,
    };
    let created;
    if (session) {
      created = await Order.create([orderPayload], { session });
      created = created[0];
    } else {
      created = await Order.create(orderPayload);
    }
    return { order: created, stockUpdates };
  });
}

module.exports = { finalizeGroundBookingConfirm, finalizeProductOrder, findActiveOverlap };

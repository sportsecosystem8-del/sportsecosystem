const crypto = require('crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const { effectiveProductPrice } = require('./pricing');
const { productPrimaryImagePath } = require('./productImages');

function hashProductItems(items) {
  const normalized = [...items]
    .map((x) => ({
      productId: String(x.productId),
      quantity: Math.max(1, parseInt(x.quantity, 10) || 1),
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Validates cart and returns totals for Stripe + order creation.
 * @returns {{ total: number, lineDocs: Array, ownerId: import('mongoose').Types.ObjectId, itemHash: string }}
 */
async function buildProductOrderContext(items) {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('items required');
    err.statusCode = 400;
    throw err;
  }
  let total = 0;
  const lineDocs = [];
  let ownerId;
  const itemHash = hashProductItems(items);

  for (const line of items) {
    const prod = await Product.findById(line.productId);
    if (!prod || !prod.isActive) {
      const err = new Error(`Invalid product ${line.productId}`);
      err.statusCode = 400;
      throw err;
    }
    const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
    if (prod.stock < qty) {
      const err = new Error(`Insufficient stock for ${prod.name}`);
      err.statusCode = 400;
      throw err;
    }
    if (ownerId && ownerId.toString() !== prod.businessOwner.toString()) {
      const err = new Error('All items must be from the same store');
      err.statusCode = 400;
      throw err;
    }
    const seller = await User.findById(prod.businessOwner);
    if (
      !seller ||
      seller.role !== 'business_owner' ||
      seller.verificationStatus !== 'verified' ||
      seller.isSuspended
    ) {
      const err = new Error(`Product "${prod.name}" is not from a verified store.`);
      err.statusCode = 400;
      throw err;
    }
    ownerId = prod.businessOwner;
    const unit = effectiveProductPrice(prod);
    const sub = unit * qty;
    total += sub;
    lineDocs.push({
      product: prod._id,
      name: prod.name,
      unitPrice: unit,
      quantity: qty,
      imagePath: productPrimaryImagePath(prod),
      description: prod.description || '',
      category: prod.category || '',
      sportType: prod.sportType || '',
      listPrice: prod.price,
    });
  }

  total = Math.round(total * 100) / 100;
  return { total, lineDocs, ownerId, itemHash };
}

module.exports = { buildProductOrderContext, hashProductItems };

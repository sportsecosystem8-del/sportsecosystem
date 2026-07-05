const mongoose = require('mongoose');

function transactionUnsupported(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    err?.code === 20 ||
    msg.includes('replica set') ||
    msg.includes('transaction numbers are only allowed')
  );
}

/**
 * Run work inside a MongoDB transaction when supported (Atlas / replica set).
 * Falls back to a single session-less pass on standalone local MongoDB.
 */
async function runWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    if (transactionUnsupported(err)) {
      return work(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { runWithOptionalTransaction, transactionUnsupported };

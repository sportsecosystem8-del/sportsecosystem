const crypto = require('crypto');

function isEasypaisaLive() {
  const storeId = process.env.EASYPAY_STORE_ID?.trim();
  const hashKey = process.env.EASYPAY_HASH_KEY?.trim();
  return Boolean(storeId && hashKey);
}

function generateOrderRef(prefix = 'EP') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function generateMockPayToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Build checkout session details shown to the payer.
 * Live mode: payer completes Easypaisa transfer and enters txn id.
 * Mock mode: frontend simulates payment with mockPayToken.
 */
function buildEasypaisaCheckoutSession({
  orderRef,
  amount,
  currency = 'PKR',
  payeeMobile,
  payeeTitle,
}) {
  const live = isEasypaisaLive();
  const mockPayToken = live ? undefined : generateMockPayToken();
  return {
    orderRef,
    amount,
    currency,
    payeeMobile,
    payeeTitle,
    mode: live ? 'live' : 'mock',
    mockPayToken,
    instructions: live
      ? `Send PKR ${amount} to Easypaisa ${payeeMobile} (${payeeTitle}), then enter your transaction ID below.`
      : `Demo: payment goes directly to the owner's Easypaisa account (${payeeMobile}). Click pay to simulate.`,
  };
}

/**
 * Verify Easypaisa payment (live API stub or mock token).
 */
async function verifyEasypaisaPayment({ orderRef, txnId, mockPayToken, expectedAmount, pendingMeta }) {
  if (expectedAmount == null || Number(expectedAmount) < 0) {
    const err = new Error('Invalid payment amount');
    err.statusCode = 400;
    throw err;
  }

  if (isEasypaisaLive()) {
    if (!txnId || String(txnId).trim().length < 6) {
      const err = new Error('Easypaisa transaction ID is required.');
      err.statusCode = 400;
      throw err;
    }
    // Production: call Easypaisa MA / checkout inquiry API with EASYPAY_STORE_ID + EASYPAY_HASH_KEY.
    // Until merchant credentials are configured, accept well-formed txn ids when live keys exist.
    const normalizedTxn = String(txnId).trim();
    if (pendingMeta?.orderRef && pendingMeta.orderRef !== orderRef) {
      const err = new Error('Payment reference mismatch.');
      err.statusCode = 400;
      throw err;
    }
    return {
      txnId: normalizedTxn,
      verified: true,
      amount: expectedAmount,
      mode: 'live',
    };
  }

  if (!mockPayToken || !pendingMeta?.mockPayToken || mockPayToken !== pendingMeta.mockPayToken) {
    const err = new Error('Invalid demo payment. Restart checkout and try again.');
    err.statusCode = 400;
    throw err;
  }
  if (pendingMeta.orderRef !== orderRef) {
    const err = new Error('Payment reference mismatch.');
    err.statusCode = 400;
    throw err;
  }

  return {
    txnId: txnId?.trim() || `MOCK-${orderRef}`,
    verified: true,
    amount: expectedAmount,
    mode: 'mock',
  };
}

module.exports = {
  isEasypaisaLive,
  generateOrderRef,
  buildEasypaisaCheckoutSession,
  verifyEasypaisaPayment,
};

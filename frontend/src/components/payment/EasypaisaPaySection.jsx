import { useState } from 'react';
import { formatGroundBookingAmount } from '../../utils/groundBookingCurrency';
import { formatProductPrice } from '../../utils/productCurrency';

function formatAmount(amount, currency) {
  if (currency === 'PKR' || !currency) {
    return formatGroundBookingAmount(amount);
  }
  return formatProductPrice(amount);
}

/**
 * Easypaisa checkout — payer sends PKR to owner's linked mobile account.
 * Demo mode: simulate payment with one click. Live mode: enter transaction ID after paying in app.
 */
export default function EasypaisaPaySection({
  session,
  onConfirm,
  onError,
  busy = false,
  amountFormatter = formatAmount,
  submitLabel = 'Confirm payment & complete',
}) {
  const [txnId, setTxnId] = useState('');
  const [paying, setPaying] = useState(false);

  if (!session) return null;

  const isMock = session.mode === 'mock' || session.mode === 'free';
  const isFree = session.mode === 'free' || session.amount === 0;

  const runConfirm = async (payload) => {
    setPaying(true);
    try {
      await onConfirm(payload);
    } catch (e) {
      onError?.(e?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleMockPay = () => {
    runConfirm({
      orderRef: session.orderRef,
      mockPayToken: session.mockPayToken,
      easypaisaTxnId: `DEMO-${session.orderRef}`,
    });
  };

  const handleLiveSubmit = (e) => {
    e.preventDefault();
    if (!txnId.trim()) {
      onError?.('Enter your Easypaisa transaction ID.');
      return;
    }
    runConfirm({
      orderRef: session.orderRef,
      easypaisaTxnId: txnId.trim(),
    });
  };

  const handleFree = () => {
    runConfirm({ orderRef: session.orderRef });
  };

  const disabled = busy || paying;

  return (
    <div className="space-y-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
      <p className="font-headline text-xs font-bold uppercase tracking-wider text-emerald-300">Easypaisa</p>
      {isFree ? (
        <>
          <p className="text-sm text-slate-300">{session.instructions}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={handleFree}
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
          >
            {disabled ? 'Confirming…' : 'Confirm booking'}
          </button>
        </>
      ) : (
        <>
          <div className="text-sm text-slate-300 space-y-1">
            <p>
              Amount: <span className="font-bold text-white">{amountFormatter(session.amount, session.currency)}</span>
            </p>
            <p>
              Pay to: <span className="font-mono text-emerald-200">{session.payeeMobile}</span>
              {session.payeeTitle ? <span className="text-slate-400"> ({session.payeeTitle})</span> : null}
            </p>
            <p className="text-xs text-slate-500">Ref: {session.orderRef}</p>
            <p className="text-xs text-slate-400">{session.instructions}</p>
          </div>
          {isMock ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleMockPay}
              className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
            >
              {disabled ? 'Processing…' : 'Pay with Easypaisa (demo)'}
            </button>
          ) : (
            <form onSubmit={handleLiveSubmit} className="space-y-2">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                placeholder="Easypaisa transaction ID"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={disabled}
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
              >
                {disabled ? 'Verifying…' : submitLabel}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

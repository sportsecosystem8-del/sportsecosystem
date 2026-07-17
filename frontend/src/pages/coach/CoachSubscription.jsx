import { useCallback, useEffect, useState } from 'react';
import { playerBtnPrimary, playerField, playerLabel } from '../../components/player/playerClassNames';
import StripePaySection, { stripePublishableConfigured } from '../../components/payment/StripePaySection';
import { api, getErrorMessage } from '../../services/api';

export default function CoachSubscription() {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [cardLast4, setCardLast4] = useState('4242');
  const [clientSecret, setClientSecret] = useState('');
  const [pending, setPending] = useState(null);
  const [intentLoading, setIntentLoading] = useState(false);

  const useStripe = stripePublishableConfigured();

  const load = useCallback(() => {
    api
      .get('/coaches/subscription/status')
      .then((r) => setStatus(r.data.data))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startIntent = async (action) => {
    setErr('');
    setMsg('');
    setClientSecret('');
    setPending(null);
    setIntentLoading(true);
    try {
      const { data } = await api.post('/coaches/subscription/payment-intent', { action });
      setClientSecret(data.data.clientSecret);
      setPending({ action });
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setIntentLoading(false);
    }
  };

  const onStripeDone = async (paymentIntentId) => {
    if (!pending) return;
    setErr('');
    try {
      if (pending.action === 'subscribe') {
        await api.post('/coaches/subscription', { paymentIntentId });
        setMsg('Subscription active.');
      } else {
        await api.post('/coaches/subscription/renew', { paymentIntentId });
        setMsg('Subscription renewed.');
      }
      setClientSecret('');
      setPending(null);
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const payMock = async (kind) => {
    setErr('');
    setMsg('');
    try {
      if (kind === 'subscribe') {
        await api.post('/coaches/subscription', { cardLast4 });
        setMsg('Subscription active (mock payment).');
      } else {
        await api.post('/coaches/subscription/renew', { cardLast4 });
        setMsg('Renewed (mock payment).');
      }
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const price = status?.pricePkr ?? status?.priceUsd;
  const freeTier = typeof price === 'number' && price <= 0;

  return (
    <div className="max-w-2xl space-y-6 text-player-on-surface">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">PLATFORM SUBSCRIPTION</h1>
        <p className="mt-2 text-sm text-slate-400">
          Monthly fee for full coach portal access — training, sessions, and payments.
        </p>
      </div>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-player-green">{msg}</p> : null}

      {status ? (
        <div className="rounded-2xl border border-player-inner/40 bg-player-container p-5 shadow-player-card">
          <p className="font-headline text-xs font-bold uppercase tracking-wider text-slate-500">Current status</p>
          <p className="mt-2 font-orbitron text-lg text-white">
            {freeTier ? 'Free access (price set to 0)' : status.active ? 'Active' : 'Payment required'}
          </p>
          {!freeTier ? (
            <>
              <p className="mt-1 text-sm text-slate-400">
                Monthly price: <span className="text-[#ff7524]">PKR {Number(price).toLocaleString()}</span>
              </p>
              {status.renewsAt ? (
                <p className="mt-1 text-sm text-slate-400">
                  Renews / valid until: {new Date(status.renewsAt).toLocaleString()}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-400">No active period — subscribe below.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Click activate to refresh your period (no charge).</p>
          )}
        </div>
      ) : null}

      {freeTier ? (
        <button type="button" onClick={() => payMock('subscribe')} className={`${playerBtnPrimary} w-full sm:w-auto`}>
          Activate access (no charge)
        </button>
      ) : useStripe ? (
        <div className="space-y-4 rounded-2xl border border-player-inner/40 bg-player-container p-5">
          {!clientSecret ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={intentLoading}
                onClick={() => startIntent('subscribe')}
                className={playerBtnPrimary}
              >
                Pay &amp; subscribe
              </button>
              <button
                type="button"
                disabled={intentLoading}
                onClick={() => startIntent('renew')}
                className={playerBtnPrimary}
              >
                Pay &amp; renew
              </button>
            </div>
          ) : (
            <StripePaySection
              clientSecret={clientSecret}
              onSucceeded={onStripeDone}
              onError={(m) => setErr(m)}
              submitLabel="Complete payment"
              buttonClassName={`${playerBtnPrimary} w-full max-w-md`}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-player-inner/40 bg-player-container p-5">
          <div>
            <label className={playerLabel}>Mock card last 4</label>
            <input
              className={`${playerField} mt-2 max-w-xs`}
              maxLength={4}
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => payMock('subscribe')} className={playerBtnPrimary}>
              Subscribe (mock)
            </button>
            <button type="button" onClick={() => payMock('renew')} className={playerBtnPrimary}>
              Renew (mock)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

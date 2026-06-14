import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import StripePaySection, { stripePublishableConfigured } from '../../components/payment/StripePaySection';

const FREE_TRIAL_LISTINGS = 10;

/** Subscribe, renew, change tier (Stripe or mock) */
export default function BusinessSubscription() {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cardLast4, setCardLast4] = useState('4242');
  const [clientSecret, setClientSecret] = useState('');
  const [pending, setPending] = useState(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const useStripeFlow = stripePublishableConfigured();
  const hasActiveSubscription = !!(profile?.subscriptionPackage && profile?.subscriptionRenewsAt);
  const onFreeTrial = profile && !hasActiveSubscription;
  const freeTrialTotal = profile?.freeTrialListingsGranted ?? FREE_TRIAL_LISTINGS;

  useEffect(() => {
    api
      .get('/business/me/profile')
      .then((r) => setProfile(r.data?.data || null))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  const refreshProfile = () =>
    api
      .get('/business/me/profile')
      .then((r) => setProfile(r.data?.data || null))
      .catch(() => {});

  const startIntent = async (kind, pkg) => {
    setMsg('');
    setErr('');
    setClientSecret('');
    setPending(null);
    setIntentLoading(true);
    try {
      const body = { action: kind };
      if (kind === 'subscribe' || kind === 'change') body.package = pkg;
      const { data } = await api.post('/business/subscription/payment-intent', body);
      setClientSecret(data.data.clientSecret);
      setPending({
        kind,
        package: data.data.package || pkg,
      });
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setIntentLoading(false);
    }
  };

  const onStripeSucceeded = async (paymentIntentId) => {
    if (!pending) return;
    setErr('');
    try {
      if (pending.kind === 'subscribe') {
        await api.post('/business/subscription', { package: pending.package, paymentIntentId });
        setMsg(`Subscribed to ${pending.package}.`);
      } else if (pending.kind === 'renew') {
        await api.post('/business/subscription/renew', { paymentIntentId });
        setMsg('Subscription renewed.');
      } else {
        await api.put('/business/subscription/plan', { package: pending.package, paymentIntentId });
        setMsg(`Plan changed to ${pending.package}.`);
      }
      setClientSecret('');
      setPending(null);
      await refreshProfile();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const subscribeMock = async (pkg) => {
    setMsg('');
    setErr('');
    try {
      await api.post('/business/subscription', { package: pkg, cardLast4 });
      setMsg(`Subscribed to ${pkg} (mock payment).`);
      await refreshProfile();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const renewMock = async () => {
    try {
      await api.post('/business/subscription/renew');
      setMsg('Renewed (mock).');
      await refreshProfile();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  const changeMock = async (pkg) => {
    setMsg('');
    setErr('');
    try {
      await api.put('/business/subscription/plan', { package: pkg, cardLast4 });
      setMsg(`Plan changed to ${pkg} (mock).`);
      await refreshProfile();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="font-rajdhani text-5xl font-bold uppercase tracking-tight text-white">Subscription Management</h1>
      <p className="mt-1 text-sm text-slate-400">
        New businesses get {freeTrialTotal} free listings once. Paid plans: Basic 20 / Pro 40 / Premium 60 per cycle.
      </p>

      {onFreeTrial ? (
        <div className="mt-4 rounded-xl border border-[#9bffce]/30 bg-[#9bffce]/10 p-4 text-sm text-[#d7ffe8]">
          <p className="font-semibold">Free trial active</p>
          <p className="mt-1 text-[#d7ffe8]/90">
            {profile.listingSlotsRemaining ?? 0} of {freeTrialTotal} free listing slots remaining. After they are used,
            choose a paid plan below.
          </p>
        </div>
      ) : hasActiveSubscription ? (
        <div className="mt-4 rounded-xl border border-[#cc97ff]/30 bg-[#cc97ff]/10 p-4 text-sm text-[#e8d4ff]">
          Current plan: <span className="font-orbitron uppercase text-white">{profile.subscriptionPackage}</span>
          {profile.subscriptionRenewsAt ? (
            <span className="ml-2 text-[#e8d4ff]/80">
              · Renews {new Date(profile.subscriptionRenewsAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      ) : null}

      {err ? <p className="mt-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{err}</p> : null}
      {msg ? <p className="mt-4 rounded-lg bg-[#1c253b] px-3 py-2 text-sm text-[#cc97ff]">{msg}</p> : null}

      {useStripeFlow ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[#0b1324] p-4">
          <p className="text-sm text-slate-400">
            {hasActiveSubscription
              ? 'Payments use Stripe (test mode). Renew or change plan below.'
              : 'Payments use Stripe (test mode). Choose a plan to subscribe after your free trial.'}
          </p>
          {!clientSecret ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                disabled={intentLoading}
                className="rounded-xl bg-[#11192c] px-4 py-3 text-sm font-bold uppercase text-white hover:bg-[#1c253b]"
                onClick={() => startIntent('subscribe', 'basic')}
              >
                Basic — pay
              </button>
              <button
                type="button"
                disabled={intentLoading}
                className="rounded-xl bg-[#11192c] px-4 py-3 text-sm font-bold uppercase text-white hover:bg-[#1c253b]"
                onClick={() => startIntent('subscribe', 'pro')}
              >
                Pro — pay
              </button>
              <button
                type="button"
                disabled={intentLoading}
                className="rounded-xl bg-[#11192c] px-4 py-3 text-sm font-bold uppercase text-white hover:bg-[#1c253b]"
                onClick={() => startIntent('subscribe', 'premium')}
              >
                Premium — pay
              </button>
              {hasActiveSubscription ? (
                <button
                  type="button"
                  disabled={intentLoading}
                  className="rounded-xl bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-4 py-3 text-sm font-bold uppercase text-[#360061]"
                  onClick={() => startIntent('renew')}
                >
                  Renew current — pay
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 max-w-md">
              <StripePaySection
                clientSecret={clientSecret}
                onSucceeded={onStripeSucceeded}
                onError={(m) => setErr(m)}
                submitLabel="Complete payment"
                buttonClassName="w-full rounded-lg bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-4 py-3 font-headline text-sm font-bold uppercase text-[#360061]"
              />
            </div>
          )}
          {hasActiveSubscription ? (
            <>
              <p className="mt-6 text-xs uppercase tracking-widest text-slate-500">Change plan</p>
              <div className="flex flex-wrap gap-2">
                {['basic', 'pro', 'premium'].map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    disabled={intentLoading || !!clientSecret}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm uppercase text-white hover:bg-white/5"
                    onClick={() => startIntent('change', pkg)}
                  >
                    Switch to {pkg} (pay)
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-4 max-w-xs">
            <label className="text-xs uppercase text-slate-500">Mock card last 4</label>
            <input
              className="mt-1 w-full rounded-lg bg-black/40 px-3 py-2 text-white"
              maxLength={4}
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <button
              type="button"
              className="rounded-xl bg-[#11192c] px-4 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#1c253b]"
              onClick={() => subscribeMock('basic')}
            >
              Basic
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#11192c] px-4 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#1c253b]"
              onClick={() => subscribeMock('pro')}
            >
              Pro
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#11192c] px-4 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#1c253b]"
              onClick={() => subscribeMock('premium')}
            >
              Premium
            </button>
            {hasActiveSubscription ? (
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-4 py-4 text-sm font-bold uppercase tracking-wider text-[#360061]"
                onClick={renewMock}
              >
                Renew current
              </button>
            ) : null}
          </div>
          {hasActiveSubscription ? (
            <>
              <p className="mt-8 text-xs uppercase tracking-widest text-slate-500">Change plan (upgrade/downgrade guard)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['basic', 'pro', 'premium'].map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm uppercase text-white hover:bg-white/5"
                    onClick={() => changeMock(pkg)}
                  >
                    Switch to {pkg}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

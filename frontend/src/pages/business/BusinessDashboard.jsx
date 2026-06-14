import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';

/** SRS — Basic 20 / Pro 40 / Premium 60 listings; monthly prices match backend subscription charges */
const FREE_TRIAL_LISTINGS = 10;
const SUBSCRIPTION_PLANS = [
  {
    tier: 'basic',
    title: 'Basic',
    price: 19,
    listings: 20,
    tagline: 'Start selling equipment with room to grow.',
    perks: ['20 active listings per billing cycle', 'Product catalog & stock control', 'Order management & sales CSV'],
  },
  {
    tier: 'pro',
    title: 'Pro',
    price: 49,
    listings: 40,
    popular: true,
    tagline: 'For growing stores that need more shelf space.',
    perks: ['40 active listings per billing cycle', 'Everything in Basic', 'Coach directory & partnership tools'],
  },
  {
    tier: 'premium',
    title: 'Premium',
    price: 99,
    listings: 60,
    tagline: 'Maximum visibility for high-volume storefronts.',
    perks: ['60 active listings per billing cycle', 'Everything in Pro', 'Priority placement for scale'],
  },
];

/** Dashboard metrics + CSV export + date range + popular products */
export default function BusinessDashboard() {
  const [p, setP] = useState(null);
  const [sales, setSales] = useState(null);
  const [err, setErr] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadSales = () => {
    const params = {};
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    api
      .get('/business/reports/sales', { params })
      .then((r) => setSales(r.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    api
      .get('/business/me/profile')
      .then((r) => setP(r.data.data))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    loadSales();
  }, [from, to]);

  const exportCsv = async () => {
    try {
      const params = { format: 'csv' };
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();
      const res = await api.get('/business/reports/sales', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const storeName = p?.storeName || p?.businessName || 'Your Store';
  const hasActiveSubscription = !!(p?.subscriptionPackage && p?.subscriptionRenewsAt);
  const onFreeTrial = p && !hasActiveSubscription;
  const freeTrialTotal = p?.freeTrialListingsGranted ?? FREE_TRIAL_LISTINGS;

  return (
    <div className="space-y-8">
      <section className="midnight-asymmetric relative overflow-hidden bg-gradient-to-r from-[#4c1d95] via-[#7c3aed] to-[#A855F7] px-6 py-8 shadow-[0_0_60px_rgba(168,85,247,0.2)] md:px-10">
        <div className="landing-pitch-lines absolute inset-0 opacity-30" />
        <span className="material-symbols-outlined pointer-events-none absolute -right-6 -top-4 text-[160px] text-white/10">
          shopping_bag
        </span>
        <span className="material-symbols-outlined pointer-events-none absolute bottom-4 left-6 animate-float text-5xl text-player-green/20">
          sports_cricket
        </span>
        <span className="material-symbols-outlined pointer-events-none absolute right-24 bottom-6 animate-float-reverse text-4xl text-[#00E5FF]/25">
          sports_tennis
        </span>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[#e9d5ff]">Sports commerce · Live</p>
            <h1 className="portal-hero-glow mt-2 font-display text-4xl uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
              {storeName}
            </h1>
            <p className="mt-2 font-headline text-sm uppercase tracking-[0.18em] text-white/80">
              Gear up athletes — cricket & badminton equipment storefront
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Cricket gear', 'Badminton gear', 'Orders', 'Subscriptions'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-black/20 px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/business/products"
              className="inline-flex items-center gap-2 bg-white px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-[#4c1d95] transition hover:brightness-95"
            >
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              Manage products
            </Link>
            <Link
              to="/business/orders"
              className="inline-flex items-center gap-2 border-2 border-white/80 px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              View orders
            </Link>
          </div>
        </div>
      </section>

      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="business-glass flex flex-wrap gap-3 rounded-2xl p-4">
        <label className="text-xs text-slate-400">
          From
          <input type="date" className="ml-2 rounded bg-black/40 px-2 py-1 text-white" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input type="date" className="ml-2 rounded bg-black/40 px-2 py-1 text-white" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {sales && (
        <div className="space-y-4">
          <div className="business-glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Sales</p>
              <p className="mt-1 font-orbitron text-2xl text-[#9bffce]">
                {sales.orderCount} orders · {sales.revenue} revenue
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-[#cc97ff]/50 px-4 py-2 font-headline text-sm font-bold uppercase tracking-[0.12em] text-[#cc97ff] transition hover:bg-[#cc97ff]/10"
            >
              Export CSV
            </button>
          </div>
          {sales.popularProducts?.length ? (
            <div className="business-glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-slate-400">Popular products</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {sales.popularProducts.map((row) => (
                  <li key={row._id}>
                    {row._id} — qty {row.qty} · revenue {row.revenue?.toFixed?.(2) ?? row.revenue}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {p && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="business-glass group rounded-2xl p-6 transition hover:border-[#cc97ff]/20 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]">
              <span className="material-symbols-outlined mb-2 text-2xl text-[#cc97ff]/60 transition group-hover:text-[#cc97ff]">storefront</span>
              <p className="text-xs uppercase tracking-widest text-slate-400">Store</p>
              <p className="business-stat-glow mt-2 font-headline text-2xl font-bold text-white">{p.storeName || p.businessName || '—'}</p>
            </div>
            <div className="business-glass group rounded-2xl p-6 transition hover:border-player-green/20 hover:shadow-[0_0_30px_rgba(0,255,135,0.1)]">
              <span className="material-symbols-outlined mb-2 text-2xl text-player-green/60 transition group-hover:text-player-green">inventory_2</span>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                {onFreeTrial ? 'Free trial listings left' : 'Listing slots remaining'}
              </p>
              <p className="business-stat-glow mt-2 font-orbitron text-2xl font-bold text-[#9bffce]">
                {p.listingSlotsRemaining ?? '—'}
                {onFreeTrial ? (
                  <span className="ml-1 text-sm font-normal text-slate-400">/ {freeTrialTotal}</span>
                ) : null}
              </p>
            </div>
            <div className="business-glass group rounded-2xl p-6 sm:col-span-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                {onFreeTrial ? 'Free trial' : 'Renews'}
              </p>
              <p className="mt-2 font-orbitron text-lg font-bold text-slate-200">
                {onFreeTrial ? (
                  <span className="text-[#cc97ff]">One-time · {freeTrialTotal} listings</span>
                ) : p.subscriptionRenewsAt ? (
                  new Date(p.subscriptionRenewsAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>

          {onFreeTrial && Number(p.listingSlotsRemaining || 0) === 0 ? (
            <div className="rounded-2xl border border-[#cc97ff]/30 bg-[#cc97ff]/10 p-4 text-sm text-[#e8d4ff]">
              Your free trial listings are used up. Choose Basic, Pro, or Premium below to continue selling.
            </div>
          ) : null}

          <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-headline text-2xl font-bold uppercase tracking-tight text-white">Subscription</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {onFreeTrial
                    ? `New businesses get ${freeTrialTotal} free listings once. After that, pick a paid plan.`
                    : 'Choose a plan that matches your catalog size. Prices are per month (USD).'}
                </p>
              </div>
              <p className="text-xs uppercase tracking-widest text-[#cc97ff]/90">
                {hasActiveSubscription ? (
                  <>
                    Current:{' '}
                    <span className="font-orbitron text-sm text-[#cc97ff]">{p.subscriptionPackage}</span>
                  </>
                ) : (
                  <span className="font-orbitron text-sm text-[#9bffce]">No paid plan yet</span>
                )}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrent = hasActiveSubscription && p.subscriptionPackage === plan.tier;
                return (
                  <div
                    key={plan.tier}
                    className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                      plan.popular
                        ? 'border-[#cc97ff]/60 bg-gradient-to-b from-[#1a2235] to-[#11192c] shadow-[0_0_40px_-8px_rgba(204,151,255,0.35)] lg:-mt-1 lg:mb-1'
                        : 'border-white/10 bg-[#11192c]'
                    } ${isCurrent ? 'ring-2 ring-[#9bffce]/50 ring-offset-2 ring-offset-[#070e1d]' : ''}`}
                  >
                    {plan.popular ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-4 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-[#360061]">
                        Most popular
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span className="absolute right-4 top-4 rounded-md bg-[#9bffce]/15 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-wider text-[#9bffce]">
                        Current
                      </span>
                    ) : null}

                    <p className="font-headline text-xl font-bold uppercase tracking-wide text-white">{plan.title}</p>
                    <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-400">{plan.tagline}</p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="font-orbitron text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-sm text-slate-500">/month</span>
                    </div>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wider text-[#cc97ff]/90">
                      Up to {plan.listings} listings / cycle
                    </p>

                    <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-white/10 pt-6">
                      {plan.perks.map((line) => (
                        <li key={line} className="flex gap-2 text-sm text-slate-300">
                          <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-[#9bffce]/90">check_circle</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/business/subscription"
                      className={`mt-8 block w-full rounded-xl py-3 text-center font-headline text-sm font-bold uppercase tracking-[0.12em] transition ${
                        isCurrent
                          ? 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
                          : plan.popular
                            ? 'bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] text-[#360061] hover:brightness-110'
                            : 'border border-[#cc97ff]/30 bg-[#1c253b] text-[#cc97ff] hover:bg-[#252f47]'
                      }`}
                    >
                      {isCurrent ? 'Manage billing' : onFreeTrial ? 'Subscribe — ' + plan.title : 'Choose ' + plan.title}
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

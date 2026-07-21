import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminCard from '../../components/admin/AdminCard';
import AdminIcon from '../../components/admin/AdminIcon';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminBtnPrimary, adminBtnSecondary } from '../../components/admin/adminClassNames';
import CoachAvatar from '../../components/CoachAvatar';
import { api, getErrorMessage } from '../../services/api';

const PREVIEW_N = 4;

function StatCard({ label, value, accent, icon }) {
  return (
    <AdminCard accent={accent} interactive className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-headline text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="font-orbitron mt-1 text-3xl font-black tabular-nums text-white">{value ?? '—'}</p>
        </div>
        <div className="rounded-lg bg-admin-cyan/10 p-3 text-admin-cyan">
          <AdminIcon name={icon} className="text-[26px]" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-label text-[10px] font-bold text-emerald-400">
          Live
        </span>
        <span className="font-label text-[10px] text-slate-500">Platform data</span>
      </div>
    </AdminCard>
  );
}

function ChartPlaceholder({ title, subtitle }) {
  return (
    <AdminCard accent="none" className="border border-white/[0.06] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-slate-200">{title}</h3>
          {subtitle ? <p className="mt-0.5 font-label text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <AdminIcon name="show_chart" className="text-[22px] text-slate-600" />
      </div>
      <div className="relative h-40 overflow-hidden rounded-lg bg-admin-well">
        <svg className="absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="dashGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <path
            d="M0,120 Q60,100 120,70 T240,40 T360,55 T400,30 L400,140 L0,140 Z"
            fill="url(#dashGrad)"
          />
          <path
            d="M0,120 Q60,100 120,70 T240,40 T360,55 T400,30"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="absolute bottom-3 left-3 font-label text-[10px] uppercase tracking-wider text-slate-500">
          Chart placeholder
        </p>
      </div>
    </AdminCard>
  );
}

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [coachPreview, setCoachPreview] = useState([]);
  const [bizPreview, setBizPreview] = useState([]);
  const [pendingCoachesCount, setPendingCoachesCount] = useState(0);
  const [pendingBizCount, setPendingBizCount] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setErr('');
      try {
        const [dashRes, coachesRes, bizRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/verification/coaches'),
          api.get('/admin/verification/business'),
        ]);
        if (cancelled) return;
        setD(dashRes.data.data);
        const coaches = coachesRes.data.data || [];
        const biz = bizRes.data.data || [];
        setPendingCoachesCount(coaches.length);
        setPendingBizCount(biz.length);
        setCoachPreview(coaches.slice(0, PREVIEW_N));
        setBizPreview(biz.slice(0, PREVIEW_N));
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmtPkr = (n) =>
    typeof n === 'number'
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)
      : '—';

  const pendingTotal = pendingCoachesCount + pendingBizCount;

  return (
    <div>
      <section className="midnight-asymmetric relative mb-8 overflow-hidden bg-gradient-to-r from-[#00363d] via-[#0a4f5c] to-admin-cyan/70 px-6 py-8 shadow-admin-glow md:px-10">
        <div className="landing-pitch-lines absolute inset-0 opacity-25" />
        <span className="material-symbols-outlined pointer-events-none absolute -right-4 -top-2 text-[150px] text-white/10">
          stadium
        </span>
        <span className="material-symbols-outlined pointer-events-none absolute bottom-4 left-8 animate-float text-4xl text-player-green/20">
          sports_cricket
        </span>
        <span className="material-symbols-outlined pointer-events-none absolute right-20 top-8 animate-float-reverse text-4xl text-[#00E5FF]/20">
          sports_tennis
        </span>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-admin-cyan/90">Sports ecosystem · Platform ops</p>
            <h1 className="portal-hero-glow mt-2 font-display text-4xl uppercase tracking-tight text-white md:text-5xl">
              Arena Command Center
            </h1>
            <p className="mt-2 font-headline text-sm uppercase tracking-[0.16em] text-white/75">
              Cricket & badminton — players, coaches, grounds & commerce
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: 'groups', label: `${d?.users?.players ?? '—'} Players` },
                { icon: 'sports_soccer', label: `${d?.users?.coaches ?? '—'} Coaches` },
                { icon: 'storefront', label: `${d?.users?.businesses ?? '—'} Stores` },
              ].map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm"
                >
                  <AdminIcon name={badge.icon} className="text-sm text-admin-cyan" />
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/verification/coaches" className={adminBtnPrimary}>
              <AdminIcon name="verified_user" className="text-lg" />
              Verify coaches
            </Link>
            <Link to="/admin/monitor/bookings" className={adminBtnSecondary}>
              <AdminIcon name="event_note" className="text-lg" />
              Bookings
            </Link>
          </div>
        </div>
      </section>

      <AdminPageHeader
        title="Overview"
        subtitle="Platform health, verification queue, and activity at a glance."
        actions={
          <>
            <Link to="/admin/reports" className={adminBtnSecondary}>
              <AdminIcon name="analytics" className="text-lg" />
              Reports
            </Link>
            <Link to="/admin/verification/coaches" className={adminBtnPrimary}>
              <AdminIcon name="verified_user" className="text-lg" />
              Verification
            </Link>
          </>
        }
      />

      {err ? (
        <AdminCard accent="orange" className="mb-6 p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}

      {d && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total players" value={d.users?.players} accent="cyan" icon="groups" />
            <StatCard label="Total coaches" value={d.users?.coaches} accent="gold" icon="sports_soccer" />
            <StatCard label="Business owners" value={d.users?.businesses} accent="orange" icon="storefront" />
            <StatCard
              label="Platform revenue (PKR)"
              value={fmtPkr(d.revenueTotalPkr ?? d.revenueTotal)}
              accent="cyan"
              icon="payments"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Subscription revenue (PKR)"
              value={fmtPkr(d.revenueSubscriptionPkr ?? d.revenueSubscriptionUsd)}
              accent="gold"
              icon="subscriptions"
            />
            <StatCard
              label="Admin ground bookings (PKR)"
              value={fmtPkr(d.revenueLocalPkr)}
              accent="gold"
              icon="stadium"
            />
            <StatCard
              label="Marketplace volume (PKR)"
              value={fmtPkr(d.marketplaceVolumePkr)}
              accent="orange"
              icon="storefront"
            />
          </div>

          {d.health ? (
            <AdminCard accent="none" className="mb-8 border border-white/[0.06] p-5">
              <p className="font-headline text-xs font-bold uppercase tracking-wider text-slate-400">System health</p>
              <p className="mt-2 text-sm text-slate-300">
                Database: <span className="text-emerald-400">{d.health.database}</span> · Uptime {d.health.uptimeSec}s ·{' '}
                {d.health.nodeEnv}
              </p>
            </AdminCard>
          ) : null}

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <AdminCard accent="cyan" className="p-6">
              <p className="font-headline text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirmed ground bookings
              </p>
              <p className="font-orbitron mt-2 text-2xl font-black tabular-nums text-white">
                {d.bookingsConfirmed}
              </p>
            </AdminCard>
            <AdminCard accent="none" className="border border-white/[0.06] p-6">
              <p className="font-headline text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending verification
              </p>
              <p className="font-orbitron mt-2 text-2xl font-black tabular-nums text-admin-cyan">{pendingTotal}</p>
              <p className="mt-1 font-label text-[11px] text-slate-500">
                Preview: first {PREVIEW_N} per queue — open Verification for full lists.
              </p>
            </AdminCard>
          </div>

          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            <ChartPlaceholder title="Booking trend" subtitle="Ground bookings — last 30 days (placeholder)" />
            <ChartPlaceholder title="Ground utilization" subtitle="Slot usage across venues (placeholder)" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminCard accent="cyan" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">
                  Pending coaches
                </h2>
                <Link
                  to="/admin/verification/coaches"
                  className="font-label text-xs font-semibold text-admin-cyan hover:underline"
                >
                  View all
                </Link>
              </div>
              <ul className="max-h-72 divide-y divide-white/[0.04] overflow-y-auto admin-scrollbar">
                {coachPreview.length === 0 ? (
                  <li className="px-6 py-10 text-center text-sm text-slate-500">No pending coach applications.</li>
                ) : (
                  coachPreview.map((u) => (
                    <li key={u._id} className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-white/[0.04]">
                      <CoachAvatar profile={u.coachProfile} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{u.coachProfile?.fullName || u.email}</p>
                        <p className="font-label text-xs text-slate-500">{u.email}</p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </AdminCard>

            <AdminCard accent="orange" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">
                  Pending business
                </h2>
                <Link
                  to="/admin/verification/business"
                  className="font-label text-xs font-semibold text-admin-cyan hover:underline"
                >
                  View all
                </Link>
              </div>
              <ul className="max-h-72 divide-y divide-white/[0.04] overflow-y-auto admin-scrollbar">
                {bizPreview.length === 0 ? (
                  <li className="px-6 py-10 text-center text-sm text-slate-500">
                    No pending business verifications.
                  </li>
                ) : (
                  bizPreview.map((u) => (
                    <li key={u._id} className="px-6 py-3.5 transition-colors hover:bg-white/[0.04]">
                      <p className="text-sm font-semibold text-slate-200">
                        {u.businessProfile?.businessName || u.email}
                      </p>
                      <p className="font-label text-xs text-slate-500">{u.email}</p>
                    </li>
                  ))
                )}
              </ul>
            </AdminCard>
          </div>

          <AdminCard accent="none" className="mt-8 border border-dashed border-white/10 p-6">
            <div className="flex items-center gap-3 text-slate-500">
              <AdminIcon name="history" className="text-[22px]" />
              <div>
                <p className="text-sm font-semibold text-slate-400">Recent activity</p>
                <p className="mt-0.5 font-label text-xs">Audit trail can be extended in a later phase.</p>
              </div>
            </div>
          </AdminCard>
        </>
      )}

      {!d && !err ? (
        <div className="flex items-center justify-center py-24 font-label text-sm text-slate-500">
          Loading dashboard…
        </div>
      ) : null}
    </div>
  );
}

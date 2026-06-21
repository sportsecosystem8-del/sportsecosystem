import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api, getErrorMessage } from '../../services/api';

function Stat({ label, value, ok }) {
  return (
    <div>
      <p className="font-headline text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 font-orbitron text-lg font-bold tabular-nums ${ok === false ? 'text-admin-orange' : 'text-white'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function formatUptime(sec) {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AdminMonitorPerformance() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api
      .get('/admin/monitor/performance')
      .then((r) => setData(r.data.data))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  const health = data?.health;
  const services = data?.services;
  const stats = data?.stats;
  const dbOk = health?.database === 'connected';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System monitor"
        subtitle="Platform and API health status."
      />
      {err ? (
        <AdminCard accent="orange" className="p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard accent="cyan" className="p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">API & server</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Stat label="Database" value={health?.database} ok={dbOk} />
            <Stat label="Uptime" value={formatUptime(health?.uptimeSec)} />
            <Stat label="Environment" value={health?.nodeEnv} />
            <Stat label="Node" value={health?.nodeVersion} />
          </div>
        </AdminCard>
        <AdminCard accent="orange" className="p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">Memory (MB)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Heap used" value={health?.memoryMb?.heapUsed} />
            <Stat label="Heap total" value={health?.memoryMb?.heapTotal} />
            <Stat label="RSS" value={health?.memoryMb?.rss} />
          </div>
        </AdminCard>
        <AdminCard accent="gold" className="p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">Services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Stat label="Stripe payments" value={services?.stripe ? 'Enabled' : 'Mock / off'} ok={services?.stripe} />
            <Stat label="Email mailer" value={services?.mailer ? 'Configured' : 'Not configured'} ok={services?.mailer} />
          </div>
        </AdminCard>
        <AdminCard accent="none" className="border border-white/[0.06] p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">Platform stats</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Total users" value={stats?.users} />
            <Stat label="Ground bookings" value={stats?.bookings} />
            <Stat label="Completed payments" value={stats?.paymentsCompleted} />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

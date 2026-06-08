import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import AdminIcon from '../components/admin/AdminIcon';
import PortalAtmosphere from '../components/PortalAtmosphere';
import { useAuth } from '../hooks/useAuth';

function navLinkClass({ isActive }) {
  const base =
    'flex items-center gap-4 border-l-4 py-4 pl-5 pr-6 font-headline tracking-wide transition-all';
  return isActive
    ? `${base} border-admin-cyan bg-gradient-to-r from-admin-cyan/10 to-transparent font-bold text-admin-cyan`
    : `${base} border-transparent font-semibold text-slate-400 rounded-r-lg hover:bg-[#1C2333] hover:text-admin-cyan`;
}

const sections = [
  {
    title: 'Overview',
    items: [{ to: '/admin', end: true, label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    title: 'Verification',
    items: [
      { to: '/admin/verification/coaches', label: 'Verify coaches', icon: 'verified_user' },
      { to: '/admin/verification/business', label: 'Verify business', icon: 'storefront' },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/admin/directory', label: 'Coaches & business', icon: 'groups' },
      { to: '/admin/users', label: 'Users', icon: 'manage_accounts' },
      { to: '/admin/sports', label: 'Sports', icon: 'sports_soccer' },
      { to: '/admin/grounds', label: 'Grounds', icon: 'stadium' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/monitor/bookings', label: 'Monitor bookings', icon: 'event_note' },
      { to: '/admin/monitor/performance', label: 'Monitor performance', icon: 'monitoring' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: 'analytics' },
      { to: '/admin/subscriptions', label: 'Subscriptions', icon: 'payments' },
      { to: '/admin/complaints', label: 'Complaints', icon: 'report_problem' },
    ],
  },
  {
    title: 'Platform',
    items: [{ to: '/admin/settings', label: 'Settings', icon: 'settings' }],
  },
];

function avatarInitials(email) {
  if (!email) return 'AD';
  const local = email.split('@')[0] || '';
  const parts = local.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return local.slice(0, 2).toUpperCase() || 'AD';
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = useMemo(() => avatarInitials(user?.email), [user?.email]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    onNavigate?.();
  };

  return (
    <>
      <div className="p-8 pb-6">
        <Link to="/admin" onClick={onNavigate} className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-admin-cyan/30 to-admin-cyan-deep/20 ring-1 ring-admin-cyan/30 transition group-hover:scale-105">
            <AdminIcon name="stadium" className="text-xl text-admin-cyan" />
          </span>
          <div>
            <p className="font-headline text-lg font-black uppercase tracking-tight text-white">
              Sports <span className="text-admin-cyan">Ecosystem</span>
            </p>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-admin-cyan/70">Admin · Control</p>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto admin-scrollbar px-2">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-6 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass} onClick={onNavigate}>
                    <AdminIcon name={item.icon} className="shrink-0 text-[22px] opacity-90" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-6">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-admin-surface-high p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-admin-cyan/20 font-label text-sm font-bold text-admin-cyan">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white" title={user?.email}>
              {user?.email}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-admin-cyan">
              {user?.role === 'admin' ? 'System admin' : user?.role?.replace('_', ' ') || 'admin'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full rounded-lg border border-white/10 py-2.5 font-headline text-xs font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:border-admin-cyan/30 hover:text-admin-cyan"
        >
          Log out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const headerInitials = useMemo(() => avatarInitials(user?.email), [user?.email]);

  return (
    <div className="admin-app relative flex min-h-screen">
      <PortalAtmosphere variant="admin" />
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className="shadow-admin-sidebar z-50 hidden h-screen min-h-0 w-[260px] shrink-0 flex-col border-r border-admin-cyan/10 bg-admin-canvas/95 backdrop-blur-xl md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col">
        <SidebarContent />
      </aside>

      <aside
        className={`shadow-admin-sidebar fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen w-[260px] flex-col bg-admin-canvas transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="relative z-10 flex min-h-screen w-full min-w-0 flex-1 flex-col md:ml-[260px]">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800/50 bg-admin-canvas/80 px-4 backdrop-blur-xl md:left-[260px] md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/5 md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <AdminIcon name="menu" />
            </button>
            <h2 className="hidden items-center gap-2 font-headline text-sm font-bold uppercase tracking-[0.16em] text-admin-cyan sm:flex">
              <AdminIcon name="sports_soccer" className="text-lg" />
              Platform Command Center
              <AdminIcon name="leaderboard" className="text-lg" />
            </h2>
            <div className="relative hidden max-w-xs flex-1 group sm:block md:max-w-md">
              <AdminIcon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[20px] text-slate-500 transition-colors group-focus-within:text-admin-cyan"
              />
              <input
                type="search"
                placeholder="Search platform data..."
                readOnly
                aria-label="Search (visual only)"
                className="w-full rounded-lg border-0 bg-admin-surface-low py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 transition-all focus:outline-none focus:ring-1 focus:ring-admin-cyan/50"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <Link
              to="/admin/settings"
              className="relative flex h-10 w-10 items-center justify-center text-slate-400 transition-colors hover:text-admin-cyan"
              title="Notifications"
            >
              <AdminIcon name="notifications" className="text-[22px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-admin-secondary-container" />
            </Link>
            <Link
              to="/admin/settings"
              className="flex h-10 w-10 items-center justify-center text-slate-400 transition-colors hover:text-admin-cyan"
              title="Settings"
            >
              <AdminIcon name="settings" className="text-[22px]" />
            </Link>
            <div className="hidden h-8 w-px bg-slate-800 sm:block" />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-admin-surface-high font-label text-xs font-bold text-admin-cyan"
              title={user?.email}
            >
              {headerInitials}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-x-hidden px-4 pb-10 pt-20 admin-scrollbar md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

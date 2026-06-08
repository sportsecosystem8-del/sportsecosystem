import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import PortalAtmosphere from '../components/PortalAtmosphere';
import PlayerIcon from '../components/player/PlayerIcon';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/player', end: true, label: 'Dashboard', icon: 'dashboard' },
  { to: '/player/profile', label: 'Account', icon: 'manage_accounts' },
  { to: '/player/performance', label: 'Performance', icon: 'monitoring' },
  { to: '/player/training', label: 'Schedule', icon: 'calendar_today' },
  { to: '/player/coaches', label: 'Team', icon: 'groups' },
  { to: '/player/orders', label: 'Orders', icon: 'leaderboard' },
  { to: '/player/grounds', label: 'Grounds', icon: 'stadium' },
  { to: '/player/shop', label: 'Equipment', icon: 'shopping_bag' },
  { to: '/player/notifications', label: 'Alerts', icon: 'notifications' },
  { to: '/player/complaint', label: 'Support', icon: 'help' },
];

function navClass({ isActive }) {
  const base = 'flex items-center gap-4 px-6 py-4 font-headline text-sm font-semibold uppercase transition-all duration-300';
  return isActive
    ? `${base} translate-x-1 border-r-4 border-player-green bg-player-inner text-player-green shadow-[0_0_15px_rgba(0,255,135,0.1)]`
    : `${base} text-slate-500 hover:bg-player-inner/50 hover:text-white`;
}

function headerTitle(pathname) {
  const p = pathname.replace(/\/$/, '') || '/player';
  const exact = NAV.find((n) => n.end && (p === n.to || p === `${n.to}/`));
  if (exact) return exact.label;
  const rest = [...NAV].filter((n) => !n.end).sort((a, b) => b.to.length - a.to.length);
  const hit = rest.find((n) => p === n.to || p.startsWith(`${n.to}/`));
  return hit?.label || 'Dashboard';
}

function displayName(user) {
  const n = user?.playerProfile?.fullName;
  if (n) return n;
  if (user?.email) return user.email.split('@')[0];
  return 'Player';
}

function initials(user) {
  const n = displayName(user);
  const parts = n.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return n.slice(0, 2).toUpperCase() || 'P';
}

function SidebarBody({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = displayName(user);
  const av = useMemo(() => initials(user), [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    onNavigate?.();
  };

  return (
    <>
      <div className="mb-10 flex items-center gap-3 px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-player-green to-player-cyan shadow-[0_0_20px_rgba(0,255,135,0.25)]">
          <PlayerIcon name="stadium" className="text-lg text-player-bg" />
        </div>
        <div className="min-w-0">
          <Link
            to="/player"
            onClick={onNavigate}
            className="block font-headline text-lg font-black uppercase leading-none tracking-tight text-white"
          >
            Sports{' '}
            <span className="text-player-green">Ecosystem</span>
          </Link>
          <p className="text-[10px] font-orbitron uppercase tracking-[0.2em] text-player-green/70">Player · Arena</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto player-scrollbar">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass} onClick={onNavigate}>
            <PlayerIcon name={item.icon} className="text-[22px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-2 border-t border-player-inner pt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-4 px-6 py-2 text-left text-slate-500 transition-colors hover:text-white"
        >
          <PlayerIcon name="logout" className="text-sm" />
          <span className="font-headline text-xs uppercase">Log out</span>
        </button>
        <div className="flex items-center gap-3 px-6 pt-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-player-green/30 font-label text-xs font-bold text-player-green">
            {av}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="text-[10px] font-headline uppercase tracking-tighter text-slate-500">Athlete</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PlayerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = headerTitle(pathname);
  const headerAv = useMemo(() => initials(user), [user]);

  const shellAside =
    'fixed left-0 top-0 z-[60] flex h-full w-[260px] flex-col border-r border-player-green/10 bg-player-surface/95 py-8 pl-0 pr-0 pt-20 shadow-player-sidebar backdrop-blur-xl';

  return (
    <div className="player-app relative min-h-screen">
      <PortalAtmosphere variant="player" />
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-player-inner/50 bg-player-bg/80 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-8">
          <button
            type="button"
            className="rounded p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <PlayerIcon name="menu" />
          </button>
          <span className="hidden items-center gap-2 font-headline text-sm font-bold uppercase tracking-[0.2em] text-player-green lg:inline-flex">
            <PlayerIcon name="sports_cricket" className="text-lg" />
            Train · Book · Compete
            <PlayerIcon name="sports_tennis" className="text-lg" />
          </span>
          <span className="truncate font-headline text-xs font-bold uppercase tracking-wider text-player-green lg:hidden">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/player/notifications"
            className="relative text-slate-400 transition-colors hover:text-white"
            aria-label="Notifications"
          >
            <PlayerIcon name="notifications" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-player-orange" />
          </Link>
          <Link
            to="/player/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-player-green/40 text-slate-400 transition-colors hover:border-player-green hover:text-player-green"
            title="Account"
            aria-label="Account"
          >
            <span className="font-orbitron text-xs font-bold text-player-green">{headerAv}</span>
          </Link>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-[55] bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={`${shellAside} hidden lg:flex`}>
        <SidebarBody />
      </aside>

      <aside
        className={`${shellAside} transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarBody onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="relative z-10 min-h-screen lg:ml-[260px] lg:pt-0">
        <main className="relative z-10 min-h-screen px-6 pb-12 pt-24 lg:px-6 lg:pt-24 player-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

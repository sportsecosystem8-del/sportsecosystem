import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const portals = [
  {
    title: 'Players',
    tag: 'Train & Compete',
    desc: 'Book grounds, find coaches, track performance, and shop gear — cricket & badminton in one flow.',
    icon: 'sports_martial_arts',
    sport: 'sports_cricket',
    accent: 'from-[#00FF87]/20 to-[#00B4D8]/10',
    border: 'border-player-green/30',
    text: 'text-player-green',
  },
  {
    title: 'Coaches',
    tag: 'Midnight Stadium',
    desc: 'Requests, sessions, plans, evaluations, and payments — a command center built for elite coaching.',
    icon: 'military_tech',
    sport: 'sports',
    accent: 'from-[#ff7524]/20 to-[#FF6B00]/10',
    border: 'border-[#ff7524]/30',
    text: 'text-[#ff7524]',
  },
  {
    title: 'Business',
    tag: 'Velocity Pro',
    desc: 'List products, fulfil orders, manage subscriptions, and partner with verified coaches.',
    icon: 'storefront',
    sport: 'sports_tennis',
    accent: 'from-[#A855F7]/25 to-[#9c48ea]/10',
    border: 'border-[#cc97ff]/30',
    text: 'text-[#cc97ff]',
  },
];

const sports = [
  { icon: 'sports_cricket', label: 'Cricket', color: 'text-player-green' },
  { icon: 'sports_tennis', label: 'Badminton', color: 'text-[#00E5FF]' },
  { icon: 'stadium', label: 'Ground Booking', color: 'text-[#ff7524]' },
  { icon: 'fitness_center', label: 'Training', color: 'text-[#cc97ff]' },
  { icon: 'leaderboard', label: 'Performance', color: 'text-player-green' },
  { icon: 'shopping_bag', label: 'Sports Gear', color: 'text-[#00B4D8]' },
];

const marqueeItems = [
  'CRICKET',
  'BADMINTON',
  'COACHING',
  'GROUND BOOKING',
  'PERFORMANCE TRACKING',
  'SPORTS GEAR',
  'LIVE SESSIONS',
  'MIDNIGHT STADIUM',
];

const sportHighlights = [
  {
    sport: 'Cricket',
    icon: 'sports_cricket',
    tagline: 'From nets to match day',
    features: ['Indoor net booking', 'Coach-led sessions', 'Bat & gear shop', 'Stats & evaluations'],
    gradient: 'from-player-green/20 via-[#00B4D8]/10 to-transparent',
    border: 'border-player-green/25',
    accent: 'text-player-green',
    glow: 'shadow-[0_0_40px_rgba(0,255,135,0.12)]',
  },
  {
    sport: 'Badminton',
    icon: 'sports_tennis',
    tagline: 'Court-ready in minutes',
    features: ['Court reservations', 'Skill drills & plans', 'Rackets & shuttles', 'Match analytics'],
    gradient: 'from-[#00E5FF]/20 via-[#00B4D8]/10 to-transparent',
    border: 'border-[#00E5FF]/25',
    accent: 'text-[#00E5FF]',
    glow: 'shadow-[0_0_40px_rgba(0,229,255,0.12)]',
  },
];

function SportsMarquee() {
  const items = [...marqueeItems, ...marqueeItems];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#0a1220]/90 py-3">
      <div className="flex w-max animate-marquee gap-8">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-3 font-headline text-sm font-bold uppercase tracking-[0.25em] text-slate-500"
          >
            <span className="material-symbols-outlined text-base text-player-green">sports_score</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function FloatingSportsIcons() {
  const icons = [
    { icon: 'sports_cricket', className: 'left-[8%] top-[18%] animate-float text-player-green/30', size: 'text-6xl' },
    { icon: 'sports_tennis', className: 'right-[10%] top-[22%] animate-float-reverse text-[#00E5FF]/25', size: 'text-5xl' },
    { icon: 'sports_soccer', className: 'left-[15%] bottom-[28%] animate-float-delayed text-white/10', size: 'text-4xl' },
    { icon: 'sports_martial_arts', className: 'right-[18%] bottom-[32%] animate-float text-[#ff7524]/20', size: 'text-5xl' },
    { icon: 'sports_baseball', className: 'left-1/2 top-[12%] -translate-x-1/2 animate-bounce-ball text-player-green/20', size: 'text-3xl' },
  ];
  return (
    <>
      {icons.map((item) => (
        <span
          key={item.icon + item.className}
          className={`material-symbols-outlined pointer-events-none absolute select-none ${item.size} ${item.className}`}
        >
          {item.icon}
        </span>
      ))}
    </>
  );
}

function StadiumHeroVisual() {
  return (
    <div className="relative mx-auto mt-14 max-w-2xl landing-fade-up-4">
      <div className="absolute -inset-4 rounded-full bg-player-green/10 blur-3xl animate-pulse-glow" />
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0f1a2e] to-[#070e1d] p-8 shadow-player-hero">
        <div className="landing-pitch-lines absolute inset-0 opacity-60" />
        <div className="relative flex flex-col items-center">
          <div className="mb-6 flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-[#0b1324]/80 px-4 py-2 backdrop-blur-sm">
            <span className="font-orbitron text-[10px] uppercase tracking-widest text-player-green animate-score-flash">
              ● Live Arena
            </span>
            <span className="font-orbitron text-xs tabular-nums text-slate-400">2026</span>
            <span className="font-headline text-xs font-bold uppercase tracking-wider text-white">Match Ready</span>
          </div>

          <div className="relative flex h-44 w-full items-end justify-center">
            <div className="landing-court-arc absolute bottom-2 h-36 w-72 border-b-0" />
            <div className="absolute bottom-0 h-1 w-full max-w-xs rounded-full bg-gradient-to-r from-transparent via-player-green/40 to-transparent" />

            <span className="material-symbols-outlined absolute bottom-10 left-[22%] animate-float text-5xl text-player-green/70">
              sports_cricket
            </span>
            <span className="material-symbols-outlined absolute bottom-14 right-[24%] animate-float-reverse text-4xl text-[#00E5FF]/70">
              sports_tennis
            </span>
            <span className="material-symbols-outlined absolute bottom-6 animate-bounce-ball text-3xl text-white/80">
              sports_soccer
            </span>
          </div>

          <div className="mt-4 grid w-full grid-cols-3 gap-2">
            {[
              { v: '2', l: 'Sports' },
              { v: '24/7', l: 'Booking' },
              { v: '100%', l: 'Digital' },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-xl border border-white/[0.06] bg-[#0b1324]/60 py-3 text-center backdrop-blur-sm"
              >
                <p className="font-orbitron text-lg font-black text-white">{s.v}</p>
                <p className="font-headline text-[9px] uppercase tracking-widest text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'player') return <Navigate to="/player" replace />;
  if (user?.role === 'coach') return <Navigate to="/coach" replace />;
  if (user?.role === 'business_owner') return <Navigate to="/business" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="landing-app relative min-h-screen overflow-x-hidden bg-[#070e1d] text-[#dfe5fb]">
      {/* Stadium atmosphere */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-[#A855F7]/15 blur-[120px] animate-floodlight-sweep" />
        <div className="absolute -right-20 top-1/3 h-[400px] w-[400px] rounded-full bg-[#00FF87]/10 blur-[100px] animate-floodlight-sweep [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-[#00E5FF]/10 blur-[90px] animate-pulse-glow" />
        <div className="landing-pitch-lines absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f12]/40 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:4px_4px]" />
        <FloatingSportsIcons />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#070e1d]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-player-green/20 to-[#A855F7]/20 ring-1 ring-white/10 transition group-hover:scale-105">
              <span className="material-symbols-outlined text-xl text-player-green">stadium</span>
            </span>
            <span className="font-headline text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
              Sports{' '}
              <span className="bg-gradient-to-r from-player-green to-[#cc97ff] bg-clip-text text-transparent">
                Ecosystem
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-player-green to-[#00B4D8] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#004620] shadow-[0_0_24px_rgba(0,255,135,0.3)] transition hover:scale-[1.02] hover:brightness-110"
            >
              <span className="material-symbols-outlined text-base">sports_score</span>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <SportsMarquee />

      <main>
        {/* Hero */}
        <section className="relative px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <div className="landing-fade-up-1 inline-flex items-center gap-2 rounded-full border border-player-green/25 bg-player-green/10 px-4 py-1.5">
              <span className="material-symbols-outlined text-base text-player-green">sports_cricket</span>
              <span className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-player-green sm:text-xs">
                Cricket & Badminton Platform
              </span>
              <span className="material-symbols-outlined text-base text-[#00E5FF]">sports_tennis</span>
            </div>

            <h1 className="landing-fade-up-2 mt-6 font-headline text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
              Step onto the{' '}
              <span className="landing-shimmer-text animate-shimmer">digital pitch</span>
              <br className="hidden sm:block" />
              <span className="text-slate-300"> — train, book & compete</span>
            </h1>

            <p className="landing-fade-up-3 mx-auto mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
              Pakistan&apos;s all-in-one sports hub. Book indoor grounds, hire verified coaches, track your
              performance, and grab gear — built for cricket and badminton athletes.
            </p>

            <div className="landing-fade-up-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-player-green to-[#00B4D8] px-10 py-4 font-headline text-lg font-bold uppercase tracking-[0.12em] text-[#004620] shadow-[0_0_40px_rgba(0,255,135,0.35)] transition hover:scale-[1.03] sm:w-auto"
              >
                <span className="material-symbols-outlined transition group-hover:rotate-12">sports_martial_arts</span>
                Join the arena
              </Link>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#414859]/50 bg-[#11192c]/80 px-10 py-4 font-headline text-lg font-bold uppercase tracking-[0.1em] text-white backdrop-blur transition hover:border-player-green/40 hover:bg-[#1c253b] sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </div>

          <StadiumHeroVisual />

          {/* Quick sports icons */}
          <div className="landing-fade-up-5 mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            {sports.map((s, i) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#0b1324]/70 px-4 py-2 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/10"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className={`material-symbols-outlined text-lg ${s.color}`}>{s.icon}</span>
                <span className="font-headline text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-3">
            {[
              { n: '3', l: 'Portals', icon: 'hub' },
              { n: '2', l: 'Core Sports', icon: 'emoji_events' },
              { n: '1', l: 'Ecosystem', icon: 'stadium' },
            ].map((s, i) => (
              <div
                key={s.l}
                className="landing-card-shine group rounded-2xl border border-white/[0.06] bg-[#0b1324]/80 px-6 py-8 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:border-player-green/20 hover:shadow-player-stadium"
                style={{ animationDelay: `${0.8 + i * 0.1}s` }}
              >
                <span className="material-symbols-outlined mb-2 text-2xl text-player-green/60 transition group-hover:scale-110 group-hover:text-player-green">
                  {s.icon}
                </span>
                <p className="landing-stat-glow font-orbitron text-4xl font-black text-white sm:text-5xl">{s.n}</p>
                <p className="mt-2 font-headline text-xs uppercase tracking-[0.2em] text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cricket & Badminton spotlight */}
        <section className="relative border-t border-white/[0.06] bg-[#0b1324]/50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="font-orbitron text-xs uppercase tracking-[0.3em] text-player-green">Game on</p>
              <h2 className="mt-3 font-headline text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
                Built for your sport
              </h2>
              <p className="mt-3 text-slate-400">Cricket nets or badminton courts — everything you need under one roof.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {sportHighlights.map((sport) => (
                <div
                  key={sport.sport}
                  className={`group relative overflow-hidden rounded-2xl border ${sport.border} bg-gradient-to-br ${sport.gradient} p-8 transition hover:-translate-y-1 ${sport.glow}`}
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl transition group-hover:bg-white/10" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-orbitron text-[10px] uppercase tracking-[0.25em] ${sport.accent}`}>
                        {sport.tagline}
                      </p>
                      <h3 className="mt-2 font-headline text-3xl font-bold text-white">{sport.sport}</h3>
                    </div>
                    <span
                      className={`material-symbols-outlined text-5xl opacity-70 transition group-hover:scale-110 group-hover:opacity-100 ${sport.accent}`}
                    >
                      {sport.icon}
                    </span>
                  </div>
                  <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                    {sport.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                        <span className={`material-symbols-outlined text-base ${sport.accent}`}>check_circle</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Three portals */}
        <section className="relative px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
                Three portals. One ecosystem.
              </h2>
              <p className="mt-3 text-slate-400">Players, coaches, and businesses — each with a dedicated experience.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {portals.map((p) => (
                <div
                  key={p.title}
                  className={`landing-card-shine group relative overflow-hidden rounded-2xl border ${p.border} bg-gradient-to-br ${p.accent} p-8 transition hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.35)]`}
                >
                  <span
                    className={`material-symbols-outlined absolute -right-4 -top-4 text-[7rem] opacity-[0.06] ${p.text} transition group-hover:opacity-[0.12]`}
                  >
                    {p.sport}
                  </span>
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-orbitron text-[10px] uppercase tracking-[0.25em] ${p.text}`}>{p.tag}</p>
                      <h3 className="mt-2 font-headline text-2xl font-bold text-white">{p.title}</h3>
                    </div>
                    <span
                      className={`material-symbols-outlined text-4xl opacity-80 transition group-hover:scale-110 ${p.text}`}
                    >
                      {p.icon}
                    </span>
                  </div>
                  <p className="relative mt-4 text-sm leading-relaxed text-slate-400">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-player-green/20 bg-gradient-to-br from-[#11192c] to-[#0b1324] p-10 text-center shadow-[0_0_60px_rgba(0,255,135,0.15)] sm:p-14">
            <div className="landing-pitch-lines absolute inset-0 opacity-40" />
            <span className="material-symbols-outlined relative mx-auto block animate-float text-5xl text-player-green/50">
              stadium
            </span>
            <h2 className="relative mt-4 font-headline text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
              Ready to enter the arena?
            </h2>
            <p className="relative mt-4 text-slate-400">
              Register as a player, coach, or business owner — your dashboard awaits on the pitch.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-player-green to-[#00B4D8] px-8 py-3.5 font-headline text-sm font-bold uppercase tracking-widest text-[#004620] shadow-lg transition hover:scale-[1.02] hover:brightness-110"
              >
                <span className="material-symbols-outlined text-lg">how_to_reg</span>
                Register now
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-player-green underline-offset-4 transition hover:underline"
              >
                Already a member? Sign in
              </Link>
            </div>
          </div>
        </section>

        <footer className="relative mt-4 border-t border-white/[0.06] px-4 pb-8 pt-16 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-player-green/40 to-transparent" />
          <div className="landing-pitch-lines pointer-events-none absolute inset-0 opacity-20" />

          <div className="relative mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0f1a2e]/90 to-[#070e1d]/95 p-8 shadow-[0_-20px_60px_rgba(0,255,135,0.06)] backdrop-blur-sm sm:p-12">
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
                {/* Brand */}
                <div className="lg:col-span-4">
                  <Link to="/" className="group inline-flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-player-green/25 to-[#A855F7]/20 ring-1 ring-white/10 transition group-hover:scale-105 group-hover:ring-player-green/30">
                      <span className="material-symbols-outlined text-2xl text-player-green">stadium</span>
                    </span>
                    <div>
                      <p className="font-headline text-lg font-black uppercase tracking-tight text-white">
                        Sports Ecosystem
                      </p>
                      <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-player-green/80">
                        Train · Book · Compete
                      </p>
                    </div>
                  </Link>
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
                    Your all-in-one hub for cricket and badminton — grounds, coaches, gear, and performance in one
                    place.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      { icon: 'sports_cricket', label: 'Cricket', color: 'text-player-green border-player-green/20 bg-player-green/10' },
                      { icon: 'sports_tennis', label: 'Badminton', color: 'text-[#00E5FF] border-[#00E5FF]/20 bg-[#00E5FF]/10' },
                    ].map((badge) => (
                      <span
                        key={badge.label}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-headline font-bold uppercase tracking-wider ${badge.color}`}
                      >
                        <span className="material-symbols-outlined text-sm">{badge.icon}</span>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <p className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-white">Platform</p>
                  <ul className="mt-4 space-y-3">
                    {[
                      { to: '/register', label: 'Get started', icon: 'rocket_launch' },
                      { to: '/login', label: 'Sign in', icon: 'login' },
                      { to: '/register', label: 'Create account', icon: 'person_add' },
                    ].map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="group flex items-center gap-2 text-sm text-slate-500 transition hover:text-player-green"
                        >
                          <span className="material-symbols-outlined text-base opacity-50 transition group-hover:opacity-100">
                            {link.icon}
                          </span>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Join as */}
                <div className="sm:col-span-1 lg:col-span-3">
                  <p className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-white">Join as</p>
                  <ul className="mt-4 space-y-3">
                    {[
                      { label: 'Player', icon: 'sports_martial_arts', desc: 'Book & train', accent: 'hover:border-player-green/30 hover:bg-player-green/5' },
                      { label: 'Coach', icon: 'military_tech', desc: 'Manage sessions', accent: 'hover:border-[#ff7524]/30 hover:bg-[#ff7524]/5' },
                      { label: 'Business', icon: 'storefront', desc: 'Sell sports gear', accent: 'hover:border-[#cc97ff]/30 hover:bg-[#cc97ff]/5' },
                    ].map((role) => (
                      <li key={role.label}>
                        <Link
                          to="/register"
                          className={`flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition ${role.accent}`}
                        >
                          <span className="material-symbols-outlined text-lg text-slate-400">{role.icon}</span>
                          <div>
                            <p className="font-headline text-sm font-semibold text-slate-300">{role.label}</p>
                            <p className="text-[11px] text-slate-600">{role.desc}</p>
                          </div>
                          <span className="material-symbols-outlined ml-auto text-base text-slate-600">arrow_forward</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features mini */}
                <div className="lg:col-span-3">
                  <p className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-white">What you get</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      { icon: 'stadium', label: 'Grounds' },
                      { icon: 'fitness_center', label: 'Training' },
                      { icon: 'leaderboard', label: 'Stats' },
                      { icon: 'shopping_bag', label: 'Gear shop' },
                    ].map((f) => (
                      <div
                        key={f.label}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-[#0b1324]/50 px-3 py-2.5 transition hover:border-player-green/20 hover:bg-player-green/5"
                      >
                        <span className="material-symbols-outlined text-base text-player-green/70">{f.icon}</span>
                        <span className="font-headline text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/register"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-player-green/90 to-[#00B4D8]/90 py-3 font-headline text-xs font-bold uppercase tracking-[0.15em] text-[#004620] shadow-[0_0_24px_rgba(0,255,135,0.2)] transition hover:scale-[1.02] hover:brightness-110"
                  >
                    <span className="material-symbols-outlined text-base">sports_score</span>
                    Enter the arena
                  </Link>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
                <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  © {new Date().getFullYear()} Sports Ecosystem Platform
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <span className="flex items-center gap-1.5 font-headline text-[10px] uppercase tracking-widest text-slate-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-player-green" />
                    All systems operational
                  </span>
                  <span className="hidden h-3 w-px bg-white/10 sm:block" />
                  <span className="font-headline text-[10px] uppercase tracking-widest text-slate-600">
                    Admin access by invitation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

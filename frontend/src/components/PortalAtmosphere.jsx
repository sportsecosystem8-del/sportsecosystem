const VARIANTS = {
  player: {
    glowA: 'bg-player-green/12',
    glowB: 'bg-player-cyan/10',
    glowC: 'bg-player-violet/10',
    turf: 'from-[#0a1f12]/35',
    icons: [
      { name: 'sports_cricket', className: 'left-[6%] top-[14%] text-player-green/20 animate-float', size: 'text-6xl' },
      { name: 'sports_tennis', className: 'right-[8%] top-[20%] text-player-cyan/15 animate-float-reverse', size: 'text-5xl' },
      { name: 'stadium', className: 'right-[20%] bottom-[18%] text-white/5 animate-float-delayed', size: 'text-7xl' },
    ],
  },
  coach: {
    glowA: 'bg-[#FF6B00]/18',
    glowB: 'bg-player-orange/12',
    glowC: 'bg-player-green/8',
    turf: 'from-[#1a0f05]/40',
    icons: [
      { name: 'sports_cricket', className: 'left-[10%] top-[16%] text-[#FF6B00]/15 animate-float', size: 'text-6xl' },
      { name: 'fitness_center', className: 'right-[12%] top-[22%] text-white/8 animate-float-reverse', size: 'text-5xl' },
      { name: 'military_tech', className: 'left-[18%] bottom-[20%] text-[#ff7524]/12 animate-float-delayed', size: 'text-5xl' },
    ],
  },
  business: {
    glowA: 'bg-[#A855F7]/18',
    glowB: 'bg-[#cc97ff]/12',
    glowC: 'bg-player-cyan/8',
    turf: 'from-[#120a1f]/35',
    icons: [
      { name: 'shopping_bag', className: 'left-[8%] top-[18%] text-[#cc97ff]/15 animate-float', size: 'text-5xl' },
      { name: 'sports_cricket', className: 'right-[10%] top-[14%] text-player-green/12 animate-float-reverse', size: 'text-6xl' },
      { name: 'storefront', className: 'right-[22%] bottom-[16%] text-[#A855F7]/12 animate-float-delayed', size: 'text-6xl' },
    ],
  },
  admin: {
    glowA: 'bg-admin-cyan/12',
    glowB: 'bg-admin-cyan-deep/10',
    glowC: 'bg-player-green/8',
    turf: 'from-[#001a1f]/35',
    icons: [
      { name: 'stadium', className: 'left-[7%] top-[15%] text-admin-cyan/12 animate-float', size: 'text-6xl' },
      { name: 'sports_soccer', className: 'right-[9%] top-[20%] text-white/6 animate-float-reverse', size: 'text-5xl' },
      { name: 'leaderboard', className: 'left-[20%] bottom-[18%] text-admin-cyan/10 animate-float-delayed', size: 'text-5xl' },
    ],
  },
};

export default function PortalAtmosphere({ variant = 'player' }) {
  const cfg = VARIANTS[variant] || VARIANTS.player;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className={`absolute -left-32 top-0 h-[480px] w-[480px] rounded-full blur-[120px] animate-floodlight-sweep ${cfg.glowA}`} />
      <div
        className={`absolute -right-24 top-1/3 h-[380px] w-[380px] rounded-full blur-[100px] animate-floodlight-sweep [animation-delay:2s] ${cfg.glowB}`}
      />
      <div className={`absolute bottom-0 left-1/4 h-[280px] w-[280px] rounded-full blur-[90px] animate-pulse-glow ${cfg.glowC}`} />
      <div className="landing-pitch-lines absolute inset-0 opacity-[0.18]" />
      <div className={`absolute inset-0 bg-gradient-to-t ${cfg.turf} via-transparent to-transparent`} />
      <div className="absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:4px_4px]" />
      {cfg.icons.map((icon) => (
        <span
          key={icon.name + icon.className}
          className={`material-symbols-outlined absolute select-none ${icon.size} ${icon.className}`}
        >
          {icon.name}
        </span>
      ))}
    </div>
  );
}

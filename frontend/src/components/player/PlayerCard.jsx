/**
 * Midnight Stadium surfaces — coach pannel/coach_dashboard + DESIGN.md
 * accentLeft mirrors stat cards (border-l-4 role accent); default = ghost edge only.
 */
const accentMap = {
  green: 'border-l-4 border-player-green border-t-0 border-r-0 border-b-0',
  orange: 'border-l-4 border-player-orange border-t-0 border-r-0 border-b-0',
  violet: 'border-l-4 border-player-violet border-t-0 border-r-0 border-b-0',
  cyan: 'border-l-4 border-player-cyan border-t-0 border-r-0 border-b-0',
};

export default function PlayerCard({
  children,
  className = '',
  neon = true,
  elevate = true,
  accentLeft = null,
  as = 'div',
}) {
  const edge = accentLeft ? accentMap[accentLeft] || '' : 'border border-[#434857]/10';
  const base = `midnight-asymmetric bg-player-container p-6 shadow-lg ${edge}`;
  const motion = 'transition-[box-shadow,transform] duration-300 ease-out';
  const lift = elevate && neon ? 'hover:-translate-y-0.5' : '';
  const hover = neon ? `${lift} hover:shadow-xl hover:shadow-black/40` : '';
  const Wrapper = as;

  return (
    <Wrapper className={`${base} ${neon ? `${motion} ${hover}` : ''} ${className}`.trim()}>{children}</Wrapper>
  );
}

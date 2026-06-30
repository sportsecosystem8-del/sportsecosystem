const accentMap = {
  cyan: 'border-l-admin-cyan',
  orange: 'border-l-admin-orange',
  gold: 'border-l-admin-gold',
  none: '',
};

export default function AdminCard({
  children,
  className = '',
  accent = 'cyan',
  as = 'div',
  interactive = false,
}) {
  const border = accentMap[accent] ?? accentMap.cyan;
  const accentCls = accent === 'none' ? '' : `border-l-4 ${border}`;
  const motion = interactive
    ? 'group relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]'
    : '';
  const Wrapper = as;

  return (
    <Wrapper className={`admin-glass rounded-admin-lg ${accentCls} ${motion} ${className}`.trim()}>
      {interactive ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-admin-cyan/20 to-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </Wrapper>
  );
}

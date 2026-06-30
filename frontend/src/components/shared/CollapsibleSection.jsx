import { useState } from 'react';

/** Compact collapsible block for long evaluation/plan cards */
export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  maxHeightClass = 'max-h-64',
  children,
  accentClass = 'border-player-inner/50 bg-player-bg/30',
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-lg border ${accentClass}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7524]">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="material-symbols-outlined text-lg text-slate-500">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open ? (
        <div className={`overflow-y-auto border-t border-white/5 px-4 py-3 ${maxHeightClass}`}>{children}</div>
      ) : null}
    </div>
  );
}

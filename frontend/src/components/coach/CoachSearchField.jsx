import { coachField } from './coachClassNames';

/** Coach-panel search input (requests, student roster, etc.). */
export default function CoachSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  id,
  'aria-label': ariaLabel = 'Search',
}) {
  return (
    <div className={`relative ${className}`}>
      <span
        className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-500"
        aria-hidden
      >
        search
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${coachField} pl-10 pr-9`}
        aria-label={ariaLabel}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:text-white"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      ) : null}
    </div>
  );
}

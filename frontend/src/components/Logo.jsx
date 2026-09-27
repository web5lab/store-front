export const APP_NAME = 'Stockbook';

/** A bill book with a stamp pressed on its corner. */
export default function Logo({ className = '', light = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#F2F4F7' : '#14213D'} />
        <rect x="7" y="9" width="18" height="14" rx="2" fill="none" stroke={light ? '#14213D' : '#F2F4F7'} strokeWidth="2" />
        <path d="M7 14h18M13 9v5" stroke={light ? '#14213D' : '#F2F4F7'} strokeWidth="2" />
        <circle cx="23" cy="22" r="5" fill="#3F3DBC" stroke={light ? '#F2F4F7' : '#14213D'} strokeWidth="1.5" />
      </svg>
      <span className={`font-display text-[19px] font-bold tracking-[-0.02em] ${light ? 'text-white' : 'text-ink'}`}>{APP_NAME}</span>
    </span>
  );
}

import { AlertTriangle, Search, X } from 'lucide-react';
import { initials } from '@/lib/format';
import { fileUrl } from '@/lib/platform';
import Button from './Button';

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[24px] font-semibold leading-tight sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[14px] text-quiet">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search', className = '', inputRef, ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input h-10 py-0 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-faint hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Pill filters, e.g. All / Low / Out. */
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div role="tablist" className={`inline-flex max-w-full overflow-x-auto rounded-[11px] border border-rule bg-surface p-[3px] [scrollbar-width:none] ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition ${
            value === o.value ? 'bg-ink text-white' : 'text-quiet hover:text-ink'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className={`figure text-[11px] ${value === o.value ? 'text-white/70' : 'text-faint'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-rule-strong bg-paper text-quiet">
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </div>
      )}
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-[13.5px] text-quiet">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-debit-soft text-debit">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-[16px] font-semibold">This page did not load</h3>
      <p className="mt-1 max-w-sm text-[13.5px] text-quiet">{error?.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-paper-2 ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="divide-y divide-rule/70">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-6 px-4 py-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 1 ? 'flex-[2]' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Avatar({ name, src, size = 'md' }) {
  const dims = size === 'lg' ? 'h-14 w-14 text-[18px]' : size === 'sm' ? 'h-7 w-7 text-[10.5px]' : 'h-9 w-9 text-[12px]';
  return src ? (
    <img src={fileUrl(src)} alt="" className={`${dims} shrink-0 rounded-full border border-rule object-cover`} />
  ) : (
    <span className={`${dims} grid shrink-0 place-items-center rounded-full bg-paper-2 font-display font-semibold text-ink-2`}>{initials(name)}</span>
  );
}

/** A number with its sign colour: red when someone owes, green when settled. */
export function Balance({ value, type, className = '' }) {
  const v = Number(value) || 0;
  const tone = v > 0 ? 'text-debit' : v < 0 ? 'text-credit' : 'text-faint';
  const label = v === 0 ? 'Settled' : type === 'customer' ? (v > 0 ? 'owes you' : 'in advance') : v > 0 ? 'you owe' : 'advance paid';
  return (
    <span className={`inline-flex flex-col items-end leading-tight ${className}`}>
      <span className={`figure font-semibold ${tone}`}>
        {Math.abs(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
      </span>
      <span className="text-[11px] text-faint">{label}</span>
    </span>
  );
}

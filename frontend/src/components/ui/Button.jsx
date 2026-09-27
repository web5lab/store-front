import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-stamp text-white hover:bg-stamp-deep shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_6px_16px_-8px_rgb(63_61_188/0.7)]',
  ink: 'bg-ink text-white hover:bg-ink-2',
  outline: 'border border-rule-strong bg-surface text-ink hover:border-ink/40 hover:bg-paper',
  ghost: 'text-quiet hover:bg-paper-2 hover:text-ink',
  danger: 'bg-debit text-white hover:bg-debit/90',
  'danger-ghost': 'text-debit hover:bg-debit-soft',
};

const SIZES = {
  sm: 'h-8 gap-1.5 rounded-[9px] px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-[10px] px-4 text-[14px]',
  lg: 'h-12 gap-2 rounded-[12px] px-5 text-[15px]',
  icon: 'h-9 w-9 justify-center rounded-[10px]',
};

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition active:translate-y-px disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" strokeWidth={2.2} /> : null}
      {children}
    </button>
  );
}

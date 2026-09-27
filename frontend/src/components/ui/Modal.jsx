import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* Open dialogs, oldest first. A dialog can open over another (adding a
   supplier from the product form), and only the top one answers Escape. */
const stack = [];

function useDismiss(open, onClose) {
  const ref = useRef(null);
  /* Held in a ref: parents pass a fresh arrow each render, and re-running the
     effect would steal focus back and reorder the stack. */
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const token = {};
    stack.push(token);
    const onKey = (e) => e.key === 'Escape' && stack[stack.length - 1] === token && close.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    /* Focus the first field, so a form opened from the keyboard is ready to type into. */
    requestAnimationFrame(() => {
      const first = ref.current?.querySelector('input:not([type=hidden]):not(.sr-only), select, textarea, button[data-autofocus]');
      (first || ref.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      if (!stack.length) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);
  return ref;
}

/** Centred dialog for short forms. */
export default function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) {
  const ref = useDismiss(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full ${width} animate-sheet flex-col sm:animate-rise rounded-t-[18px] bg-surface shadow-2xl outline-none sm:rounded-[18px]`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-rule-strong sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 border-b border-rule px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-quiet">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-quiet hover:bg-paper">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className={`overflow-y-auto overscroll-contain px-5 py-5 ${footer ? '' : 'pb-[calc(20px+env(safe-area-inset-bottom))] sm:pb-5'}`}>{children}</div>
        {/* Phones: footer buttons share the width, clear of the home indicator. */}
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-rule bg-paper/50 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5 *:flex-1 sm:rounded-b-[18px] sm:pb-3.5 sm:*:flex-none">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Side panel for looking at one record without leaving the list. */
export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }) {
  const ref = useDismiss(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/35" onClick={onClose} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex h-full w-full ${width} animate-slide flex-col bg-surface shadow-2xl outline-none`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-surface/80 text-quiet hover:bg-paper">
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body
  );
}

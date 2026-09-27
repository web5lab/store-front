import { forwardRef, useId } from 'react';

/** Label + control + hint/error. The control gets the id and aria wiring. */
export function Field({ label, hint, error, children, className = '', optional = false }) {
  const id = useId();
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between text-[12.5px] font-semibold text-ink-2">
          {label}
          {optional && <span className="text-[11px] font-normal text-faint">Optional</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': described, 'aria-invalid': error ? 'true' : undefined })}
      {error ? (
        <p id={`${id}-error`} className="text-[12px] font-medium text-debit">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, optional, className = '', prefix, ...props }, ref) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) =>
        prefix ? (
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-faint">{prefix}</span>
            <input ref={ref} className="input figure pl-7" {...a11y} {...props} />
          </div>
        ) : (
          <input ref={ref} className="input" {...a11y} {...props} />
        )
      }
    </Field>
  );
});

export function Select({ label, hint, error, optional, className = '', children, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) => (
        <select className="input appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20fill=%22none%22%20stroke=%22%235b6478%22%20stroke-width=%222%22%3E%3Cpath%20d=%22m3%204.5%203%203%203-3%22/%3E%3C/svg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-9" {...a11y} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Textarea({ label, hint, error, optional, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) => <textarea className="input min-h-[84px] resize-y" {...a11y} {...props} />}
    </Field>
  );
}

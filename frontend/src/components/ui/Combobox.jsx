import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';

/**
 * A searchable select: type to filter, arrows to move, Enter to choose.
 * `options`: [{ value, label, sub?, right? }]
 * `onCreate(query)`: when given, the list ends with an "Add new" row, so a
 * record that does not exist yet can be made without leaving the form.
 */
export default function Combobox({ label, options, value, onChange, placeholder = 'Search…', emptyText = 'No matches', clearable = true, onCreate, createLabel = 'Add new', labelAction }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(q)) : options).slice(0, 60);
  }, [options, query]);

  /* The "Add new" row sits after the matches and is reachable with the arrows. */
  const createIndex = onCreate ? filtered.length : -1;
  const last = onCreate ? filtered.length : filtered.length - 1;

  const create = () => {
    const q = query.trim();
    setQuery('');
    setOpen(false);
    /* Let go of focus, so the dialog that follows does not hand it back and reopen the list. */
    inputRef.current?.blur();
    onCreate(q);
  };

  useEffect(() => {
    const onDoc = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (o) => {
    onChange(o.value);
    setQuery('');
    setOpen(false);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, last));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open && active === createIndex) {
      e.preventDefault();
      create();
    } else if (e.key === 'Enter' && open && filtered[active]) {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="text-[12.5px] font-semibold text-ink-2">
            {label}
          </label>
          {labelAction}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          autoComplete="off"
          className="input pr-16"
          placeholder={selected ? '' : placeholder}
          value={open ? query : selected ? selected.label : ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
          {clearable && selected && (
            <button type="button" aria-label="Clear" onClick={() => onChange('')} className="grid h-7 w-7 place-items-center rounded text-faint hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="pointer-events-none mr-1 h-4 w-4 text-faint" />
        </div>
      </div>
      {open && (
        <ul ref={listRef} id={`${id}-list`} role="listbox" className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-[12px] border border-rule bg-surface p-1 shadow-xl">
          {filtered.length === 0 && onCreate ? null : filtered.length === 0 ? (
            <li className="px-3 py-3 text-[13px] text-faint">{emptyText}</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 sm:py-2 ${i === active ? 'bg-paper' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{o.label}</p>
                  {o.sub && <p className="truncate font-mono text-[11px] text-faint">{o.sub}</p>}
                </div>
                {o.right && <div className="shrink-0 text-right text-[12px]">{o.right}</div>}
              </li>
            ))
          )}
          {onCreate && (
            <li
              data-index={createIndex}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={create}
              onMouseEnter={() => setActive(createIndex)}
              className={`sticky bottom-0 flex cursor-pointer items-center gap-3 rounded-[8px] bg-surface px-3 py-2.5 text-stamp ${filtered.length ? 'mt-1 border-t border-dashed border-rule-strong' : ''} ${active === createIndex ? '!bg-stamp-soft' : ''}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stamp text-white">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                {query.trim() ? (
                  <>
                    {createLabel} “<span className="text-ink">{query.trim()}</span>”
                  </>
                ) : (
                  createLabel
                )}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

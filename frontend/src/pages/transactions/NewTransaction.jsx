import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronUp, Minus, PackagePlus, PackageSearch, Plus, Trash2, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import FileDrop from '@/components/ui/FileDrop';
import Stamp from '@/components/ui/Stamp';
import StockGauge from '@/components/ui/StockGauge';
import { Balance, SearchInput, Skeleton } from '@/components/ui/Bits';
import { api, partyBook, tradeBook } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { dayToISO, isoDay, money, round2 } from '@/lib/format';
import PartyForm, { partySeed } from '@/pages/parties/PartyForm';
import ProductForm from '@/pages/products/ProductForm';
import { fileUrl } from '@/lib/platform';

const GST_RATES = [0, 5, 12, 18, 28];

/**
 * The counter. Left: find products and tap them onto the bill. Right: the bill
 * itself, totalled live, exactly as it will be saved.
 */
export default function NewTransaction({ kind }) {
  const sale = kind === 'sale';
  const partyType = sale ? 'customer' : 'supplier';
  const navigate = useNavigate();
  const [params] = useSearchParams();

  /* Categories and suppliers are for adding a product without leaving the bill.
     On a purchase the bill's own party list is already the suppliers. */
  const lookups = useApi(
    () => Promise.all([api.products.list(), partyBook(partyType).list(), api.categories.list(), sale ? api.suppliers.list() : null]),
    [kind]
  );
  const [products = [], parties = [], categories = [], saleSuppliers] = lookups.data || [];
  const suppliers = sale ? saleSuppliers || [] : parties;
  /* Replace one of the lookup lists after adding to it here. */
  const patchLookup = (index, list) => lookups.setData(Object.assign([...lookups.data], { [index]: list }));

  const [party, setParty] = useState(params.get('party') || '');
  const [lines, setLines] = useState([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState(0);
  const [paidInFull, setPaidInFull] = useState(true);
  const [received, setReceived] = useState('');
  const [date, setDate] = useState(isoDay());
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newParty, setNewParty] = useState(null); // prefill for the add-party dialog, or null when closed
  const [newProduct, setNewProduct] = useState(null); // prefill for the add-product dialog, or null when closed
  const searchRef = useRef(null);
  const billRef = useRef(null);
  /* On touch screens, focusing search on arrival would throw the keyboard over the page. */
  const [finePointer] = useState(() => window.matchMedia?.('(pointer: fine)').matches ?? true);

  const byId = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);
  const selectedParty = parties.find((p) => p._id === party);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? products.filter((p) => `${p.name} ${p.code}`.toLowerCase().includes(q)) : products;
    return list.slice(0, 40);
  }, [products, query]);

  /* Totals — the same arithmetic the server does, so nothing changes on save. */
  const subtotal = round2(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0));
  const disc = Math.min(round2(discount), subtotal);
  const tax = round2(((subtotal - disc) * gst) / 100);
  const total = round2(subtotal - disc + tax);
  const paid = paidInFull ? total : Math.min(round2(received), total);
  const due = round2(total - paid);
  const status = due <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

  const stockProblems = sale
    ? lines.filter((l) => {
        const p = byId.get(l.product);
        const onBill = lines.filter((x) => x.product === l.product).reduce((s, x) => s + (Number(x.quantity) || 0), 0);
        return p && onBill > p.quantity;
      })
    : [];

  const add = (p) => {
    if (sale && p.quantity <= 0) return toast.error(`${p.name} is out of stock.`);
    setLines((ls) => {
      const existing = ls.find((l) => l.product === p._id);
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: (Number(l.quantity) || 0) + 1 } : l));
      return [...ls, { product: p._id, quantity: 1, price: sale ? p.sellingPrice : p.purchasePrice }];
    });
    setQuery('');
    setActive(0);
    searchRef.current?.focus();
  };

  const update = (i, patch) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const removeLine = (i) => setLines((ls) => ls.filter((_, n) => n !== i));

  const canSave = lines.length > 0 && lines.every((l) => Number(l.quantity) >= 1) && stockProblems.length === 0 && !(due > 0 && !party);

  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await tradeBook(kind).create({
        party: party || undefined,
        date: dayToISO(date),
        items: lines.map((l) => ({ product: l.product, quantity: Number(l.quantity), price: Number(l.price) || 0 })),
        discount: disc,
        gstPercent: gst,
        amountReceived: paid,
        notes,
        attachment: attachment || undefined,
      });
      toast.success(res.message);
      navigate(`/${sale ? 'sales' : 'purchases'}/${res.data._id}`, { replace: true, state: { fresh: true } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  /* Keyboard: "/" finds a product, Ctrl/⌘+Enter saves the bill. */
  useEffect(() => {
    const onKey = (e) => {
      if (newParty || newProduct) return; // an add dialog has the keyboard
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && (matches[active] || query.trim())) {
      e.preventDefault();
      if (matches[active]) add(matches[active]);
      else openNewProduct();
    }
  };

  /* A product added mid-bill joins the list and goes onto the bill, unless a
     sale has no stock of it to sell yet. */
  const openNewProduct = () => setNewProduct({ name: query.trim(), ...(sale ? {} : { supplier: party }) });
  const productAdded = (p) => {
    patchLookup(0, [...products, p].sort((a, b) => a.name.localeCompare(b.name)));
    if (sale && p.quantity <= 0) {
      toast(`${p.name} has no stock yet, so it is not on the bill. Record a purchase or adjust its stock first.`, { icon: '📦', duration: 6000 });
      return;
    }
    add(p);
  };

  /* A party added mid-bill joins the list and is chosen straight away. The
     create response has no ledger yet, so its balance is the opening amount. */
  const partyAdded = (p) => {
    patchLookup(1, [...parties, { ...p, balance: Number(p.openingBalance) || 0 }]);
    setParty(p._id);
  };

  const partyOptions = parties.map((p) => ({
    value: p._id,
    label: p.name,
    sub: [p.code, p.phone].filter(Boolean).join(' · '),
    right: p.balance ? <Balance value={p.balance} type={partyType} /> : null,
  }));

  return (
    <div className="animate-rise">
      <Link to={sale ? '/sales' : '/purchases'} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-quiet hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {sale ? 'Sales' : 'Purchases'}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">{sale ? 'Stock goes out' : 'Stock comes in'}</p>
          <h1 className="text-[28px] font-semibold leading-tight">{sale ? 'New sale' : 'New purchase'}</h1>
        </div>
        <p className="hidden text-[12.5px] text-faint md:block">
          <kbd className="rounded border border-rule bg-surface px-1.5 font-mono text-[11px]">/</kbd> find product ·{' '}
          <kbd className="rounded border border-rule bg-surface px-1.5 font-mono text-[11px]">↑↓</kbd>{' '}
          <kbd className="rounded border border-rule bg-surface px-1.5 font-mono text-[11px]">Enter</kbd> add ·{' '}
          <kbd className="rounded border border-rule bg-surface px-1.5 font-mono text-[11px]">Ctrl Enter</kbd> save
        </p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
        {/* ── Product picker ─────────────────────────── */}
        <section className="card overflow-hidden xl:sticky xl:top-4">
          <div className="flex gap-2 border-b border-rule p-4">
            <SearchInput inputRef={searchRef} value={query} onChange={(v) => (setQuery(v), setActive(0))} onKeyDown={onSearchKey} placeholder="Find a product by name or code" autoFocus={finePointer} className="min-w-0 flex-1" />
            <Button variant="outline" icon={PackagePlus} onClick={openNewProduct} aria-label="Add new product" title="Add new product" className="px-3 sm:px-4">
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
          {lookups.loading && !lookups.data ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <PackageSearch className="mx-auto h-6 w-6 text-faint" />
              <p className="mt-3 font-semibold">No products to bill yet</p>
              <Button size="sm" icon={PackagePlus} className="mt-3" onClick={openNewProduct}>
                Add a product
              </Button>
            </div>
          ) : matches.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13.5px] text-quiet">No product matches “{query}”.</p>
              <Button size="sm" icon={PackagePlus} className="mt-3 max-w-full" onClick={openNewProduct}>
                <span className="truncate">Add “{query.trim()}” as a product</span>
              </Button>
            </div>
          ) : (
            <ul className="max-h-[46vh] overflow-y-auto overscroll-contain p-1.5 sm:max-h-[62vh]" role="listbox" aria-label="Products">
              {matches.map((p, i) => {
                const onBill = lines.find((l) => l.product === p._id);
                const out = sale && p.quantity <= 0;
                return (
                  <li key={p._id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onClick={() => add(p)}
                      onMouseEnter={() => setActive(i)}
                      disabled={out}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition disabled:opacity-45 ${i === active ? 'bg-paper' : ''}`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-rule bg-paper">
                        {p.file?.mimeType?.startsWith('image/') ? <img src={fileUrl(p.file.url)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="font-mono text-[10px] text-faint">{p.code.slice(-3)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">{p.name}</p>
                        <p className="truncate font-mono text-[11.5px] text-faint">
                          <span className="hidden sm:inline">{p.code}</span>
                          <span className={`sm:hidden ${out ? 'font-semibold text-debit' : p.quantity <= p.minimumStock ? 'font-semibold text-kraft-deep' : ''}`}>{out ? 'Out of stock' : `${p.quantity} ${p.unit} in stock`}</span>
                        </p>
                      </div>
                      <span className="hidden sm:block">
                        <StockGauge quantity={p.quantity} minimum={p.minimumStock} unit={p.unit} compact />
                      </span>
                      <span className="figure shrink-0 text-right text-[13.5px] font-semibold sm:w-24">{money(sale ? p.sellingPrice : p.purchasePrice)}</span>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${onBill ? 'bg-stamp text-white' : 'bg-paper-2 text-quiet'}`}>
                        {onBill ? <span className="figure text-[11px] font-semibold">{onBill.quantity}</span> : <Plus className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── The bill ───────────────────────────────── */}
        <section ref={billRef} className="slip mt-2 flex scroll-mt-4 flex-col">
          <div className="space-y-3 border-b border-dashed border-rule-strong p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <Combobox
                label={sale ? 'Customer' : 'Supplier'}
                options={partyOptions}
                value={party}
                onChange={setParty}
                placeholder={sale ? 'Walk-in customer' : 'Choose supplier'}
                onCreate={(q) => setNewParty(partySeed(q))}
                createLabel={`Add new ${partyType}`}
                labelAction={
                  <button type="button" onClick={() => setNewParty({})} className="-my-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-stamp hover:bg-stamp-soft">
                    <UserPlus className="h-3.5 w-3.5" /> New {partyType}
                  </button>
                }
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-ink-2">Date</span>
                <input type="date" className="input figure" value={date} onChange={(e) => setDate(e.target.value)} max={isoDay()} />
              </label>
            </div>
            {selectedParty && selectedParty.balance !== 0 && (
              <p className="rounded-[9px] bg-paper px-3 py-2 text-[12.5px] text-quiet">
                Current balance:{' '}
                <span className={`figure font-semibold ${selectedParty.balance > 0 ? 'text-debit' : 'text-credit'}`}>{money(Math.abs(selectedParty.balance))}</span>{' '}
                {sale ? (selectedParty.balance > 0 ? 'owed to you' : 'in advance') : selectedParty.balance > 0 ? 'you owe' : 'paid in advance'}
              </p>
            )}
          </div>

          {/* Lines */}
          <div className="min-h-[140px] px-5 py-3">
            {lines.length === 0 ? (
              <div className="grid h-[120px] place-items-center text-center">
                <p className="text-[13.5px] text-faint">Tap a product to put it on the bill.</p>
              </div>
            ) : (
              <ul className="divide-y divide-dashed divide-rule-strong">
                {lines.map((l, i) => {
                  const p = byId.get(l.product);
                  const over = stockProblems.includes(l);
                  return (
                    <li key={l.product} className="py-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold">{p?.name}</p>
                          <p className={`font-mono text-[11px] ${over ? 'font-semibold text-debit' : 'text-faint'}`}>{over ? `Only ${p.quantity} ${p.unit} in stock` : `${p?.code} · ${p?.quantity} ${p?.unit} in stock`}</p>
                        </div>
                        <button type="button" aria-label={`Remove ${p?.name}`} onClick={() => removeLine(i)} className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-debit-soft hover:text-debit sm:h-7 sm:w-7">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className={`inline-flex items-center rounded-[9px] border ${over ? 'border-debit' : 'border-rule-strong'}`}>
                          <button type="button" aria-label="One less" onClick={() => update(i, { quantity: Math.max(1, (Number(l.quantity) || 1) - 1) })} className="grid h-9 w-9 place-items-center text-quiet hover:text-ink sm:h-8 sm:w-8">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            aria-label="Quantity"
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={l.quantity}
                            onChange={(e) => update(i, { quantity: e.target.value })}
                            className="figure h-9 w-12 border-x sm:h-8 border-rule bg-transparent text-center text-[13.5px] font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button type="button" aria-label="One more" onClick={() => update(i, { quantity: (Number(l.quantity) || 0) + 1 })} className="grid h-9 w-9 place-items-center text-quiet hover:text-ink sm:h-8 sm:w-8">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-[12px] text-faint">×</span>
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[12px] text-faint">₹</span>
                          <input
                            aria-label="Price"
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={l.price}
                            onChange={(e) => update(i, { price: e.target.value })}
                            className="figure h-9 w-full rounded-[9px] border border-rule-strong bg-transparent pl-6 pr-2 text-[13.5px] outline-none focus:border-stamp sm:h-8"
                          />
                        </div>
                        <span className="figure ml-auto text-[14px] font-semibold">{money((Number(l.quantity) || 0) * (Number(l.price) || 0))}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2.5 border-t border-dashed border-rule-strong px-5 py-4 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-quiet">Subtotal</span>
              <span className="figure">{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="discount" className="text-quiet">
                Discount
              </label>
              <div className="relative w-32">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[12px] text-faint">−₹</span>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="figure h-8 w-full rounded-[9px] border border-rule-strong bg-transparent pl-8 pr-2 text-right outline-none focus:border-stamp"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-quiet">GST</span>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="GST rate">
                {GST_RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={gst === r}
                    onClick={() => setGst(r)}
                    className={`figure h-7 rounded-[7px] px-2 text-[12px] font-semibold transition ${gst === r ? 'bg-ink text-white' : 'bg-paper text-quiet hover:text-ink'}`}
                  >
                    {r}%
                  </button>
                ))}
                <span className="figure w-24 text-right">{money(tax)}</span>
              </div>
            </div>
            <div className="flex items-end justify-between border-t-2 border-ink pt-3">
              <span className="font-display text-[16px] font-semibold">Total</span>
              <span className="figure text-[26px] font-semibold leading-none">{money(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-3 border-t border-dashed border-rule-strong px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13.5px] font-semibold">{sale ? 'Received now' : 'Paid now'}</span>
              <div className="inline-flex rounded-[9px] border border-rule bg-paper p-[3px] text-[12.5px] font-semibold">
                <button type="button" onClick={() => setPaidInFull(true)} className={`rounded-[7px] px-2.5 py-1 ${paidInFull ? 'bg-surface text-ink shadow-sm' : 'text-quiet'}`}>
                  In full
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaidInFull(false);
                    setReceived('');
                  }}
                  className={`rounded-[7px] px-2.5 py-1 ${!paidInFull ? 'bg-surface text-ink shadow-sm' : 'text-quiet'}`}
                >
                  Part / credit
                </button>
              </div>
            </div>
            {!paidInFull && (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-faint">₹</span>
                <input
                  aria-label={sale ? 'Amount received' : 'Amount paid'}
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  inputMode="decimal"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder="0.00 — all on credit"
                  className="input figure pl-7"
                  autoFocus
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Stamp status={lines.length ? status : 'Pending'} size="lg" tilt={-4} key={status} animate={lines.length > 0} />
              <div className="text-right">
                <p className="eyebrow">Balance due</p>
                <p className={`figure text-[18px] font-semibold ${due > 0 ? 'text-debit' : 'text-credit'}`}>{money(due)}</p>
              </div>
            </div>
            {due > 0 && !party && lines.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] bg-kraft-soft px-3 py-2 text-[12.5px] font-medium text-kraft-deep">
                <span>Choose a {partyType} to put {money(due)} on their account.</span>
                <button type="button" onClick={() => setNewParty({})} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                  <UserPlus className="h-3.5 w-3.5" /> Add {partyType}
                </button>
              </div>
            )}
          </div>

          <details className="group border-t border-dashed border-rule-strong px-5 py-3">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-quiet hover:text-ink">
              <span className="group-open:hidden">+ Add note or photo of the bill</span>
              <span className="hidden group-open:inline">Note and attachment</span>
            </summary>
            <div className="mt-3 space-y-3">
              <textarea className="input min-h-[64px]" placeholder="Note printed on the bill" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Note" />
              <FileDrop value={attachment} onChange={setAttachment} accept="image/*,.pdf,.doc,.docx" hint="Photo or PDF of a paper bill" />
            </div>
          </details>

          <div className="p-5 pt-3">
            {error && (
              <p className="mb-3 rounded-[10px] bg-debit-soft px-3 py-2.5 text-[13px] font-medium text-debit" role="alert">
                {error}
              </p>
            )}
            <Button size="lg" className="w-full justify-center" disabled={!canSave} loading={busy} onClick={save}>
              {sale ? 'Save sale' : 'Save purchase'} {lines.length > 0 && <span className="figure opacity-80">· {money(total)}</span>}
            </Button>
          </div>
        </section>
      </div>

      {/* Phones: the total and Save stay under the thumb while picking products.
          Portalled, because the page's entry animation would trap a fixed bar. */}
      {createPortal(
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_-16px_rgb(20_33_61/0.35)] backdrop-blur-md xl:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button type="button" onClick={() => billRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="min-w-0">
              <span className="block text-[11.5px] font-medium text-quiet">
                {lines.length} item{lines.length === 1 ? '' : 's'}
                {due > 0 && lines.length > 0 ? ` · ${money(due)} due` : ''}
              </span>
              <span className="figure block truncate text-[19px] font-semibold leading-tight">{money(total)}</span>
            </span>
            <ChevronUp className="h-4 w-4 shrink-0 text-faint" />
          </button>
          <Button size="lg" className="justify-center px-6" disabled={!canSave} loading={busy} onClick={save}>
            Save
          </Button>
        </div>
      </div>,
      document.body
      )}

      <ProductForm
        open={Boolean(newProduct)}
        initial={newProduct || undefined}
        openingStock={sale}
        categories={categories}
        suppliers={suppliers}
        onClose={() => setNewProduct(null)}
        onSaved={productAdded}
        onCategoryAdded={(c) => patchLookup(2, [...categories, c].sort((a, b) => a.name.localeCompare(b.name)))}
        onSupplierAdded={(s) => patchLookup(sale ? 3 : 1, [...suppliers, { ...s, balance: Number(s.openingBalance) || 0 }])}
      />
      <PartyForm type={partyType} open={Boolean(newParty)} initial={newParty || undefined} onClose={() => setNewParty(null)} onSaved={partyAdded} />
    </div>
  );
}

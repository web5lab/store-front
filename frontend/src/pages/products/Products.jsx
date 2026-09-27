import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, ImageIcon, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import StockGauge from '@/components/ui/StockGauge';
import { stockState } from '@/lib/stock';
import { EmptyState, ErrorState, PageHeader, SearchInput, Segmented, TableSkeleton } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/useApi';
import { money } from '@/lib/format';
import ProductForm from './ProductForm';
import ProductDrawer from './ProductDrawer';
import { fileUrl } from '@/lib/platform';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const q = useDebounced(query);
  const stock = params.get('stock') || 'all';
  const category = params.get('category') || '';
  const openId = params.get('open');
  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState(null);
  const searchRef = useRef(null);

  /* "?new=1" can arrive while already on this page (the phone's + menu). */
  const wantsNew = params.get('new') === '1';
  const [sawNew, setSawNew] = useState(wantsNew);
  if (wantsNew !== sawNew) {
    setSawNew(wantsNew);
    if (wantsNew) {
      setEditing(null);
      setFormOpen(true);
    }
  }

  const products = useApi(() => api.products.list({ q: q || undefined, category: category || undefined }), [q, category]);
  const lookups = useApi(() => Promise.all([api.categories.list(), api.suppliers.list()]), []);
  const [categories = [], suppliers = []] = lookups.data || [];

  /* "/" jumps to search, like most tools people already use. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('new');
    setParams(next, { replace: true });
  };

  const all = useMemo(() => products.data || [], [products.data]);
  const counts = useMemo(() => {
    const c = { all: all.length, low: 0, out: 0 };
    for (const p of all) {
      const s = stockState(p.quantity, p.minimumStock);
      if (s !== 'ok') c[s]++;
    }
    return c;
  }, [all]);
  const rows = stock === 'all' ? all : all.filter((p) => stockState(p.quantity, p.minimumStock) === stock);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Stock"
        title="Products"
        description="Prices and stock levels for everything you buy and sell."
        actions={
          <Button icon={Plus} onClick={openNew}>
            Add product
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput inputRef={searchRef} value={query} onChange={setQuery} placeholder="Search name or code  ( / )" className="lg:w-80" />
        <div className="flex gap-2 lg:contents">
        <select className="input h-10 min-w-0 flex-1 py-0 lg:w-52 lg:flex-none" value={category} onChange={(e) => setParam('category', e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          <option value="none">Uncategorised</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <Segmented
          className="shrink-0 lg:ml-auto"
          value={stock}
          onChange={(v) => setParam('stock', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'low', label: 'Low', count: counts.low },
            { value: 'out', label: 'Out', count: counts.out },
          ]}
        />
        </div>
      </div>

      <div className="card overflow-hidden">
        {products.error ? (
          <ErrorState error={products.error} onRetry={products.reload} />
        ) : products.loading && !products.data ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          all.length === 0 && !q && !category ? (
            <EmptyState
              icon={Boxes}
              title="No products yet"
              body="Add the things you sell. Each one keeps its own price, stock level and history."
              action={
                <Button icon={Plus} onClick={openNew}>
                  Add product
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Boxes} title="Nothing matches" body="Try a different search or clear the filters." />
          )
        ) : (
          <>
          <ul className="divide-y divide-rule/70 sm:hidden">
            {rows.map((p) => (
              <li key={p._id}>
                <button type="button" onClick={() => setParam('open', p._id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-paper">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-rule bg-paper">
                    {p.file?.mimeType?.startsWith('image/') ? <img src={fileUrl(p.file.url)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-faint" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{p.name}</p>
                    <p className="truncate font-mono text-[11.5px] text-faint">{[p.code, p.category?.name].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="figure text-[14px] font-semibold">{money(p.sellingPrice)}</span>
                    <StockGauge quantity={p.quantity} minimum={p.minimumStock} unit={p.unit} compact />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="table-ledger min-w-[820px]">
              <thead>
                <tr>
                  <th className="w-[44%]">Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : null;
                  return (
                    <tr key={p._id} className="row-link" onClick={() => setParam('open', p._id)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-rule bg-paper">
                            {p.file?.mimeType?.startsWith('image/') ? <img src={fileUrl(p.file.url)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-faint" />}
                          </div>
                          <div className="min-w-0">
                            <button type="button" className="truncate text-left font-semibold hover:text-stamp" onClick={(e) => (e.stopPropagation(), setParam('open', p._id))}>
                              {p.name}
                            </button>
                            <p className="font-mono text-[11.5px] text-faint">{p.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-quiet">{p.category?.name || '—'}</td>
                      <td>
                        <StockGauge quantity={p.quantity} minimum={p.minimumStock} unit={p.unit} />
                      </td>
                      <td className="figure text-right text-quiet">{money(p.purchasePrice)}</td>
                      <td className="figure text-right font-semibold">{money(p.sellingPrice)}</td>
                      <td className={`figure text-right ${margin !== null && margin < 0 ? 'text-debit' : 'text-quiet'}`}>{margin === null ? '—' : `${margin.toFixed(0)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          if (params.get('new')) setParam('new', '');
        }}
        product={editing}
        categories={categories}
        suppliers={suppliers}
        onCategoryAdded={(c) => lookups.setData([[...categories, c].sort((a, b) => a.name.localeCompare(b.name)), suppliers])}
        onSupplierAdded={(s) => lookups.setData([categories, [...suppliers, s]])}
        onSaved={() => products.reload()}
      />

      <ProductDrawer
        key={openId}
        id={formOpen ? null : openId}
        onClose={() => setParam('open', '')}
        onEdit={(p) => {
          setEditing(p);
          setFormOpen(true);
        }}
        onChanged={() => products.reload()}
      />
    </div>
  );
}

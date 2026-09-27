import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, ReceiptText, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Stamp from '@/components/ui/Stamp';
import { EmptyState, ErrorState, PageHeader, SearchInput, Segmented, TableSkeleton } from '@/components/ui/Bits';
import { tradeBook } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/useApi';
import { money, moneyShort, relativeDay } from '@/lib/format';

export default function Transactions({ kind }) {
  const sale = kind === 'sale';
  const base = sale ? 'sales' : 'purchases';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const q = useDebounced(query);
  const status = params.get('status') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const page = Number(params.get('page') || 1);

  const { data, error, loading, reload } = useApi(
    () => tradeBook(kind).list({ q: q || undefined, status: status || undefined, from: from || undefined, to: to || undefined, page }),
    [kind, q, status, from, to, page]
  );

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const Icon = sale ? ReceiptText : ShoppingBag;
  const filtered = Boolean(q || status || from || to);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Trade"
        title={sale ? 'Sales' : 'Purchases'}
        description={sale ? 'Every bill you have given a customer.' : 'Every bill you have received from a supplier.'}
        actions={
          <Button icon={Plus} onClick={() => navigate(`/${base}/new`)}>
            {sale ? 'New sale' : 'New purchase'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder={`Bill number, ${sale ? 'customer' : 'supplier'} or phone`} className="xl:w-80" />
        <div className="flex items-center gap-2">
          <input type="date" aria-label="From date" className="input figure h-10 min-w-0 flex-1 py-0 text-[13px] sm:w-[150px] sm:flex-none" value={from} onChange={(e) => setParam('from', e.target.value)} />
          <span className="text-faint">–</span>
          <input type="date" aria-label="To date" className="input figure h-10 min-w-0 flex-1 py-0 text-[13px] sm:w-[150px] sm:flex-none" value={to} onChange={(e) => setParam('to', e.target.value)} />
        </div>
        <Segmented
          className="self-start xl:ml-auto"
          value={status}
          onChange={(v) => setParam('status', v)}
          options={[
            { value: '', label: 'All' },
            { value: 'Pending', label: 'Due' },
            { value: 'Partial', label: 'Part paid' },
            { value: 'Paid', label: 'Paid' },
          ]}
        />
      </div>

      {data && data.total > 0 && (
        <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-[14px] border border-rule bg-surface">
          {[
            [`${data.total} bill${data.total === 1 ? '' : 's'}`, data.sums.total, ''],
            [sale ? 'Received' : 'Paid', data.sums.received, 'text-credit'],
            ['Still due', data.sums.due, data.sums.due > 0 ? 'text-debit' : ''],
          ].map(([label, value, tone], i) => (
            <div key={label} className={`min-w-0 px-3 py-3 sm:px-4 ${i ? 'border-l border-rule' : ''}`}>
              <p className="eyebrow truncate">{label}</p>
              <p className={`figure mt-1 truncate text-[16px] font-semibold sm:text-[18px] ${tone}`}>
                <span className="sm:hidden">{moneyShort(value)}</span>
                <span className="hidden sm:inline">{money(value)}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          filtered ? (
            <EmptyState icon={Icon} title="No bills match" body="Try a different search, status or date range." />
          ) : (
            <EmptyState
              icon={Icon}
              title={sale ? 'No sales yet' : 'No purchases yet'}
              body={sale ? 'Record a sale and stock comes off the shelf, and any unpaid amount goes on the customer’s account.' : 'Record a purchase to add stock and track what you owe the supplier.'}
              action={
                <Button icon={Plus} onClick={() => navigate(`/${base}/new`)}>
                  {sale ? 'New sale' : 'New purchase'}
                </Button>
              }
            />
          )
        ) : (
          <>
            {/* Phones: one tappable row per bill — who, when, how much, and its stamp. */}
            <ul className="divide-y divide-rule/70 sm:hidden">
              {data.items.map((t) => (
                <li key={t._id}>
                  <Link to={`/${base}/${t._id}`} className="flex items-center gap-3 px-4 py-3.5 transition active:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold">{t.party?.name || (sale ? 'Walk-in' : '—')}</p>
                      <p className="truncate font-mono text-[11.5px] text-faint">
                        {t.invoiceNumber} · {relativeDay(t.date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="figure text-[14.5px] font-semibold">{money(t.total)}</span>
                      {t.balanceDue > 0 ? <span className="figure text-[11.5px] font-semibold text-debit">{money(t.balanceDue)} due</span> : <Stamp status={t.paymentStatus} />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="table-ledger min-w-[820px]">
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>{sale ? 'Customer' : 'Supplier'}</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">{sale ? 'Received' : 'Paid'}</th>
                    <th className="text-right">Due</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t._id} className="row-link" onClick={() => navigate(`/${base}/${t._id}`)}>
                      <td>
                        <p className="font-mono text-[13px] font-semibold">{t.invoiceNumber}</p>
                        <p className="text-[12px] text-faint">{relativeDay(t.date)}</p>
                      </td>
                      <td>
                        <p className="font-medium">{t.party?.name || (sale ? 'Walk-in' : '—')}</p>
                        {t.party && <p className="font-mono text-[11.5px] text-faint">{[t.party.code, t.party.phone].filter(Boolean).join(' · ')}</p>}
                      </td>
                      <td className="figure text-right font-semibold">{money(t.total)}</td>
                      <td className="figure text-right text-quiet">{money(t.amountReceived)}</td>
                      <td className={`figure text-right ${t.balanceDue > 0 ? 'font-semibold text-debit' : 'text-faint'}`}>{money(t.balanceDue)}</td>
                      <td className="text-right">
                        <Stamp status={t.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-[13px]">
                <span className="text-quiet">
                  Page {data.page} of {data.pages}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Next page" disabled={page >= data.pages} onClick={() => setParam('page', String(page + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

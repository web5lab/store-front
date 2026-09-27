import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, Boxes, Plus, ShoppingBag, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { money, moneyShort, number, relativeDay } from '@/lib/format';
import Button from '@/components/ui/Button';
import Stamp from '@/components/ui/Stamp';
import StockGauge from '@/components/ui/StockGauge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Bits';

const SALES = '#3f3dbc';
const PURCHASES = '#1a9e8f';

function Cell({ label, value, sub, to }) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="figure mt-2 truncate text-[19px] font-semibold leading-none tracking-tight sm:text-[26px]">{value}</p>
      <p className="mt-1.5 truncate text-[12px] text-quiet sm:text-[12.5px]">{sub}</p>
    </>
  );
  return to ? (
    <Link to={to} className="group block min-w-0 px-4 py-4 transition hover:bg-paper/60 active:bg-paper sm:px-5 sm:py-5">
      {body}
    </Link>
  ) : (
    <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">{body}</div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  return (
    <div className="rounded-[10px] border border-rule bg-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-[12px] font-semibold">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[12px] text-quiet">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.fill }} />
          <span className="w-16">{p.name}</span>
          <span className="figure font-semibold text-ink">{money(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Owed to you on the left, you owe on the right — the shape of a ledger page. */
function TAccount({ receivable, payable }) {
  const net = receivable - payable;
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Open accounts</h2>
        <Link to="/accounts" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-stamp hover:underline">
          Accounts <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-5 grid flex-1 grid-cols-2 border-t-2 border-ink">
        <Link to="/accounts?tab=customer" className="border-r-2 border-ink pr-4 pt-4 transition hover:opacity-80">
          <p className="eyebrow">Owed to you</p>
          <p className="figure mt-2 text-[22px] font-semibold text-debit">{moneyShort(receivable)}</p>
          <p className="mt-1 text-[12px] text-quiet">by customers</p>
        </Link>
        <Link to="/accounts?tab=supplier" className="pl-4 pt-4 text-right transition hover:opacity-80">
          <p className="eyebrow">You owe</p>
          <p className="figure mt-2 text-[22px] font-semibold text-ink">{moneyShort(payable)}</p>
          <p className="mt-1 text-[12px] text-quiet">to suppliers</p>
        </Link>
      </div>
      <div className="mt-5 flex items-baseline justify-between rounded-[10px] bg-paper px-3 py-2.5">
        <span className="text-[12.5px] font-semibold text-quiet">Net position</span>
        <span className={`figure text-[14px] font-semibold ${net >= 0 ? 'text-credit' : 'text-debit'}`}>
          {net >= 0 ? '+' : '−'}
          {money(Math.abs(net))}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(() => api.dashboard(), []);
  const today = new Date();

  const header = (
    <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow mb-1.5">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="text-[24px] font-semibold leading-tight sm:text-[32px]">Today at the counter</h1>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="outline" icon={ShoppingBag} onClick={() => navigate('/purchases/new')}>
          New purchase
        </Button>
        <Button icon={Plus} onClick={() => navigate('/sales/new')}>
          New sale
        </Button>
      </div>
    </div>
  );

  if (error) return (<>{header}<div className="card"><ErrorState error={error} onRetry={reload} /></div></>);

  if (loading && !data) {
    return (
      <>
        {header}
        <Skeleton className="h-[108px] w-full rounded-[14px]" />
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-[320px] rounded-[14px] lg:col-span-2" />
          <Skeleton className="h-[320px] rounded-[14px]" />
        </div>
      </>
    );
  }

  const d = data;
  const empty = d.counts.products === 0;
  const has30 = d.series.some((s) => s.sales || s.purchases);
  const total30 = d.series.reduce((a, s) => ({ sales: a.sales + s.sales, purchases: a.purchases + s.purchases }), { sales: 0, purchases: 0 });

  return (
    <div className="animate-rise">
      {header}

      {empty && (
        <div className="card mb-5 flex flex-col items-start gap-4 border-dashed p-5 sm:flex-row sm:items-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stamp-soft text-stamp">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Start by adding what you sell</p>
            <p className="text-[13.5px] text-quiet">Products carry the prices and stock that every bill draws from.</p>
          </div>
          <Button variant="ink" onClick={() => navigate('/products?new=1')}>
            Add first product
          </Button>
        </div>
      )}

      {/* Day and month at a glance, in ledger columns */}
      {/* 1px gaps over a rule-coloured background draw the column lines at any width. */}
      <section className="card grid grid-cols-2 gap-px overflow-hidden bg-rule lg:grid-cols-4 [&>*]:bg-surface">
        <Cell label="Sales today" value={money(d.today.sales)} sub={`${d.today.salesCount} bill${d.today.salesCount === 1 ? '' : 's'}`} to="/sales" />
        <Cell label="Bought today" value={money(d.today.purchases)} sub={`${d.today.purchasesCount} purchase${d.today.purchasesCount === 1 ? '' : 's'}`} to="/purchases" />
        <Cell label={`Sales in ${today.toLocaleDateString('en-IN', { month: 'long' })}`} value={moneyShort(d.month.sales)} sub={`${d.month.invoices} bills · bought ${moneyShort(d.month.purchases)}`} />
        <Cell label="Stock at cost" value={moneyShort(d.stock.value)} sub={`${number(d.stock.units)} units · ${d.counts.products} products`} to="/reports?kind=stock" />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold">Last 30 days</h2>
              <p className="text-[12.5px] text-quiet">Daily bill totals, including tax</p>
            </div>
            <div className="flex gap-4 text-[12.5px]" aria-label="Legend">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SALES }} />
                Sales <span className="figure font-semibold">{moneyShort(total30.sales)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: PURCHASES }} />
                Purchases <span className="figure font-semibold">{moneyShort(total30.purchases)}</span>
              </span>
            </div>
          </div>
          <div className="mt-4 h-[200px] sm:h-[240px]">
            {has30 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.series} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e1e5ec" strokeDasharray="0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: '#c9d0db' }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    tick={{ fontSize: 11, fill: '#8a93a6', fontFamily: 'IBM Plex Mono' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis width={52} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a93a6', fontFamily: 'IBM Plex Mono' }} tickFormatter={(v) => moneyShort(v).replace('₹', '')} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f2f4f7' }} />
                  <Bar dataKey="sales" name="Sales" fill={SALES} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="purchases" name="Purchases" fill={PURCHASES} radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingUp} title="No bills in the last 30 days" body="Sales and purchases will chart here as you record them." />
            )}
          </div>
        </section>

        <TAccount receivable={d.receivable} payable={d.payable} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h2 className="text-[16px] font-semibold">Latest bills</h2>
            <Link to="/sales" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-stamp hover:underline">
              All sales <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <EmptyState title="No bills yet" body="Your first sale will appear here." />
          ) : (
            <ul className="divide-y divide-rule/70 px-2 pb-2">
              {d.recent.map((t) => (
                <li key={t._id}>
                  <Link to={`/${t.kind === 'sale' ? 'sales' : 'purchases'}/${t._id}`} className="flex items-center gap-3 rounded-[10px] px-3 py-3 transition hover:bg-paper/70 active:bg-paper sm:gap-4">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] font-mono text-[10px] font-semibold ${t.kind === 'sale' ? 'bg-stamp-soft text-stamp' : 'bg-[#e0f3f0] text-[#137a6e]'}`}>
                      {t.kind === 'sale' ? 'OUT' : 'IN'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{t.party?.name || (t.kind === 'sale' ? 'Walk-in customer' : 'Unnamed supplier')}</p>
                      <p className="font-mono text-[11.5px] text-faint">
                        {t.invoiceNumber} · {relativeDay(t.date)}
                      </p>
                    </div>
                    <span className="hidden sm:block">
                      <Stamp status={t.paymentStatus} />
                    </span>
                    <span className="figure shrink-0 text-right text-[14px] font-semibold sm:w-28">{money(t.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="card">
            <div className="flex items-center justify-between px-5 pb-1 pt-5">
              <h2 className="text-[16px] font-semibold">Running low</h2>
              {d.stock.lowCount > 0 && (
                <Link to="/products?stock=low" className="rounded-full bg-kraft-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-kraft-deep">
                  {d.stock.lowCount} to reorder
                </Link>
              )}
            </div>
            {d.stock.low.length === 0 ? (
              <p className="px-5 pb-5 pt-2 text-[13.5px] text-quiet">Every product is above its reorder level.</p>
            ) : (
              <ul className="px-2 pb-2">
                {d.stock.low.map((p) => (
                  <li key={p._id}>
                    <Link to={`/products?open=${p._id}`} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition hover:bg-paper/70">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{p.name}</p>
                        <p className="font-mono text-[11px] text-faint">reorder at {p.minimumStock}</p>
                      </div>
                      <StockGauge quantity={p.quantity} minimum={p.minimumStock} unit={p.unit} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-[16px] font-semibold">Best sellers</h2>
            <p className="text-[12.5px] text-quiet">By revenue, last 30 days</p>
            {d.topProducts.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-quiet">Nothing sold in the last 30 days.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {d.topProducts.map((p) => {
                  const share = p.revenue / d.topProducts[0].revenue;
                  return (
                    <li key={p._id}>
                      <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                        <span className="truncate font-semibold">{p.name}</span>
                        <span className="figure shrink-0 text-[12.5px] text-quiet">
                          {number(p.quantity)} sold · <span className="text-ink">{moneyShort(p.revenue)}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 4)}%`, background: SALES }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookText, Boxes, FileSpreadsheet, FileText, FileType2, ReceiptText, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { date, isoDay, money, number } from '@/lib/format';

const KINDS = [
  { key: 'sales', label: 'Sales', icon: ReceiptText, body: 'Bills, tax and what is still due, by date.' },
  { key: 'purchases', label: 'Purchases', icon: ShoppingBag, body: 'What you bought and what you still owe.' },
  { key: 'stock', label: 'Stock', icon: Boxes, body: 'Every product, its level and value at cost.' },
  { key: 'ledger', label: 'Statement', icon: BookText, body: 'One customer’s or supplier’s account.' },
];

const PRESETS = [
  ['This month', () => [isoDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), isoDay()]],
  ['Last 30 days', () => [isoDay(new Date(Date.now() - 29 * 864e5)), isoDay()]],
  [
    'This financial year',
    () => {
      const now = new Date();
      const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return [isoDay(new Date(y, 3, 1)), isoDay()];
    },
  ],
  ['All time', () => ['', '']],
];

const show = (value, type) => (value === '' || value === null || value === undefined ? '' : type === 'money' ? money(value) : type === 'number' ? number(value) : type === 'date' ? date(value) : value);

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const kind = KINDS.some((k) => k.key === params.get('kind')) ? params.get('kind') : 'sales';
  const [range, setRange] = useState(PRESETS[0][1]());
  const [party, setParty] = useState('');
  const [downloading, setDownloading] = useState('');

  const dated = kind === 'sales' || kind === 'purchases';
  const query = { from: dated ? range[0] || undefined : undefined, to: dated ? range[1] || undefined : undefined, party: kind === 'ledger' ? party : undefined };
  const ready = kind !== 'ledger' || Boolean(party);

  const parties = useApi(() => (kind === 'ledger' ? Promise.all([api.customers.list(), api.suppliers.list()]) : Promise.resolve(null)), [kind]);
  const report = useApi(() => (ready ? api.reports.preview(kind, query) : Promise.resolve(null)), [kind, range[0], range[1], party]);

  const partyOptions = parties.data
    ? [
        ...parties.data[0].map((p) => ({ value: p._id, label: p.name, sub: `${p.code} · customer` })),
        ...parties.data[1].map((p) => ({ value: p._id, label: p.name, sub: `${p.code} · supplier` })),
      ]
    : [];

  const download = async (format) => {
    setDownloading(format);
    try {
      const name = await api.reports.download(kind, format, query);
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading('');
    }
  };

  const r = report.data;

  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Books" title="Reports" description="Look at the numbers here, then take them away as PDF, Word or Excel." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KINDS.map(({ key, label, icon: Icon, body }) => (
          <button
            key={key}
            type="button"
            aria-pressed={kind === key}
            onClick={() => setParams({ kind: key })}
            className={`card flex flex-col items-start p-4 text-left transition ${kind === key ? 'border-ink ring-1 ring-ink' : 'hover:border-rule-strong'}`}
          >
            <Icon className={`h-5 w-5 ${kind === key ? 'text-stamp' : 'text-faint'}`} />
            <p className="mt-3 font-display text-[16px] font-semibold">{label}</p>
            <p className="mt-0.5 hidden text-[12.5px] text-quiet sm:block">{body}</p>
          </button>
        ))}
      </div>

      <div className="card mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        {dated && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(([label, fn]) => {
                const [a, b] = fn();
                const on = range[0] === a && range[1] === b;
                return (
                  <button key={label} type="button" onClick={() => setRange([a, b])} className={`rounded-[8px] px-3 py-2 text-[12.5px] font-semibold transition ${on ? 'bg-ink text-white' : 'bg-paper text-quiet hover:text-ink'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 lg:ml-2">
              <input type="date" aria-label="From" className="input figure h-9 w-[150px] py-0 text-[13px]" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} />
              <span className="text-faint">–</span>
              <input type="date" aria-label="To" className="input figure h-9 w-[150px] py-0 text-[13px]" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} />
            </div>
          </>
        )}
        {kind === 'ledger' && (
          <div className="w-full lg:w-96">
            <Combobox label="Customer or supplier" options={partyOptions} value={party} onChange={setParty} placeholder="Search by name or code" />
          </div>
        )}
        {kind === 'stock' && <p className="text-[13px] text-quiet">Stock is always as of right now.</p>}
        <div className="flex gap-2 lg:ml-auto">
          {[
            ['pdf', 'PDF', FileText],
            ['docx', 'Word', FileType2],
            ['xlsx', 'Excel', FileSpreadsheet],
          ].map(([f, label, Icon]) => (
            <Button key={f} variant={f === 'pdf' ? 'ink' : 'outline'} icon={Icon} disabled={!ready || !r} loading={downloading === f} onClick={() => download(f)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {!ready ? (
          <EmptyState icon={BookText} title="Choose whose statement to see" body="Pick a customer or supplier above." />
        ) : report.error ? (
          <ErrorState error={report.error} onRetry={report.reload} />
        ) : !r ? (
          <TableSkeleton cols={6} />
        ) : (
          <>
            <div className="border-b border-rule px-5 py-4">
              <h2 className="text-[18px] font-semibold">{r.title}</h2>
              <p className="text-[13px] text-quiet">{r.subtitle}</p>
            </div>
            {r.rows.length === 0 ? (
              <EmptyState title="No records in this period" body="Try a wider date range." />
            ) : (
              <div className={`max-h-[60vh] overflow-auto transition-opacity ${report.loading ? 'opacity-50' : ''}`}>
                <table className="table-ledger min-w-[900px]">
                  <thead>
                    <tr>
                      {r.columns.map((c) => (
                        <th key={c.key} className={c.type === 'money' || c.type === 'number' ? 'text-right' : ''}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.slice(0, 300).map((row, i) => (
                      <tr key={i}>
                        {r.columns.map((c) => (
                          <td key={c.key} className={c.type === 'money' || c.type === 'number' ? 'figure text-right' : c.type === 'date' ? 'figure whitespace-nowrap text-quiet' : ''}>
                            {show(row[c.key], c.type)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {r.totals && (
                      <tr className="bg-paper font-semibold">
                        {r.columns.map((c, i) => (
                          <td key={c.key} className={`border-t-2 border-ink ${c.type === 'money' || c.type === 'number' ? 'figure text-right' : ''}`}>
                            {i === 0 ? 'Total' : show(r.totals[c.key], c.type)}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
                {r.rows.length > 300 && <p className="px-5 py-3 text-[12.5px] text-quiet">Showing 300 of {r.rows.length} rows. Downloads include every row.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

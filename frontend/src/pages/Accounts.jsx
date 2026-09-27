import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpenCheck } from 'lucide-react';
import { Avatar, Balance, EmptyState, ErrorState, PageHeader, Segmented, TableSkeleton } from '@/components/ui/Bits';
import { partyBook } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { money } from '@/lib/format';

/** Who owes whom, largest first. The page you open before making calls. */
export default function Accounts() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'supplier' ? 'supplier' : 'customer';
  const [showSettled, setShowSettled] = useState(false);
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(() => Promise.all([partyBook('customer').list(), partyBook('supplier').list()]), []);

  const [customers = [], suppliers = []] = data || [];
  const list = (tab === 'customer' ? customers : suppliers).filter((p) => showSettled || p.balance !== 0).sort((a, b) => b.balance - a.balance);
  const sum = (arr) => arr.reduce((s, p) => s + Math.max(p.balance, 0), 0);

  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Books" title="Accounts" description="Open balances with every customer and supplier." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4">
        {[
          ['customer', 'Owed to you', sum(customers), customers.filter((p) => p.balance > 0).length, 'text-debit'],
          ['supplier', 'You owe', sum(suppliers), suppliers.filter((p) => p.balance > 0).length, 'text-ink'],
        ].map(([key, label, total, n, tone]) => (
          <button
            key={key}
            type="button"
            onClick={() => setParams({ tab: key })}
            className={`card min-w-0 p-4 text-left transition sm:p-5 ${tab === key ? 'border-ink ring-1 ring-ink' : 'hover:border-rule-strong'}`}
          >
            <p className="eyebrow">{label}</p>
            <p className={`figure mt-2 truncate text-[20px] font-semibold leading-none sm:text-[28px] ${tone}`}>{money(total)}</p>
            <p className="mt-1.5 text-[12.5px] text-quiet sm:text-[13px]">
              {n} open {key === 'customer' ? 'customer' : 'supplier'} account{n === 1 ? '' : 's'}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <Segmented
          value={tab}
          onChange={(v) => setParams({ tab: v })}
          options={[
            { value: 'customer', label: 'Customers' },
            { value: 'supplier', label: 'Suppliers' },
          ]}
        />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-quiet">
          <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} className="h-4 w-4 accent-[#3f3dbc]" />
          Show settled
        </label>
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <TableSkeleton cols={4} />
        ) : list.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="All square" body={tab === 'customer' ? 'No customer owes you anything right now.' : 'You do not owe any supplier right now.'} />
        ) : (
          <>
          <ul className="divide-y divide-rule/70 sm:hidden">
            {list.map((p) => (
              <li key={p._id}>
                <Link to={`/${tab}s/${p._id}`} className="flex items-center gap-3 px-4 py-3 transition active:bg-paper">
                  <Avatar name={p.name} src={p.photoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{p.name}</p>
                    <p className="truncate font-mono text-[11.5px] text-faint">{[p.code, p.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Balance value={p.balance} type={tab} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="table-ledger min-w-[640px]">
              <thead>
                <tr>
                  <th>{tab === 'customer' ? 'Customer' : 'Supplier'}</th>
                  <th className="text-right">Debits</th>
                  <th className="text-right">Credits</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p._id} className="row-link" onClick={() => navigate(`/${tab}s/${p._id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} src={p.photoUrl} size="sm" />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="font-mono text-[11.5px] text-faint">{[p.code, p.phone].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="figure text-right text-quiet">{money(p.debit)}</td>
                    <td className="figure text-right text-quiet">{money(p.credit)}</td>
                    <td className="text-right">
                      <Balance value={p.balance} type={tab} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

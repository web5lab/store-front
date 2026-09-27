import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Truck, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Avatar, Balance, EmptyState, ErrorState, PageHeader, SearchInput, TableSkeleton } from '@/components/ui/Bits';
import { partyBook } from '@/lib/api';
import { useApi, useDebounced } from '@/lib/useApi';
import { money } from '@/lib/format';
import PartyForm from './PartyForm';
import { PARTY_WORDS } from '@/lib/words';

export default function Parties({ type }) {
  const w = PARTY_WORDS[type];
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const q = useDebounced(query);
  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);

  /* "?new=1" (from the phone's + menu) opens the add form, even when already on this page. */
  const wantsNew = params.get('new') === '1';
  const [sawNew, setSawNew] = useState(false);
  if (wantsNew !== sawNew) {
    setSawNew(wantsNew);
    if (wantsNew) setFormOpen(true);
  }
  const closeForm = () => {
    setFormOpen(false);
    if (wantsNew) setParams({}, { replace: true });
  };
  const { data, error, loading, reload } = useApi(() => partyBook(type).list({ q: q || undefined }), [type, q]);
  const Icon = type === 'customer' ? Users : Truck;

  const total = (data || []).reduce((s, p) => s + Math.max(p.balance, 0), 0);
  const open = (data || []).filter((p) => p.balance > 0).length;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="People"
        title={w.many}
        description={
          data?.length ? (
            <>
              {type === 'customer' ? 'Owed to you' : 'You owe'}: <span className="figure font-semibold text-ink">{money(total)}</span> across {open} open account{open === 1 ? '' : 's'}.
            </>
          ) : type === 'customer' ? (
            'People and businesses you sell to, with what each one owes.'
          ) : (
            'Who you buy from, with what you owe each one.'
          )
        }
        actions={
          <Button icon={Plus} onClick={() => setFormOpen(true)}>
            Add {w.one}
          </Button>
        }
      />

      <SearchInput value={query} onChange={setQuery} placeholder="Search name, code, phone or GSTIN" className="mb-4 sm:w-96" />

      <div className="card overflow-hidden">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <TableSkeleton cols={4} />
        ) : data.length === 0 ? (
          q ? (
            <EmptyState icon={Icon} title="Nothing matches" body="Try a different name, code or phone number." />
          ) : (
            <EmptyState
              icon={Icon}
              title={`No ${w.one}s yet`}
              body={type === 'customer' ? 'Add a customer to sell on credit and keep their account.' : 'Add a supplier to record purchases and what you owe them.'}
              action={
                <Button icon={Plus} onClick={() => setFormOpen(true)}>
                  Add {w.one}
                </Button>
              }
            />
          )
        ) : (
          <>
          <ul className="divide-y divide-rule/70 sm:hidden">
            {data.map((p) => (
              <li key={p._id}>
                <Link to={`/${w.base}/${p._id}`} className="flex items-center gap-3 px-4 py-3 transition active:bg-paper">
                  <Avatar name={p.name} src={p.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{p.name}</p>
                    <p className="truncate font-mono text-[11.5px] text-faint">{[p.code, p.phone || p.companyName].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Balance value={p.balance} type={type} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="table-ledger min-w-[720px]">
              <thead>
                <tr>
                  <th>{w.One}</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p._id} className="row-link" onClick={() => navigate(`/${w.base}/${p._id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} src={p.photoUrl} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.name}</p>
                          <p className="font-mono text-[11.5px] text-faint">
                            {p.code}
                            {p.companyName ? ` · ${p.companyName}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="figure text-quiet">{p.phone || '—'}</td>
                    <td className="font-mono text-[12.5px] text-quiet">{p.gstNumber || '—'}</td>
                    <td className="text-right">
                      <Balance value={p.balance} type={type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <PartyForm type={type} open={formOpen} onClose={closeForm} onSaved={(p) => navigate(`/${w.base}/${p._id}`)} />
    </div>
  );
}

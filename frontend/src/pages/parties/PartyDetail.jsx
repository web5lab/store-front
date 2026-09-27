import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, IndianRupee, Mail, MapPin, Pencil, Phone, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Field';
import Stamp from '@/components/ui/Stamp';
import { useConfirm } from '@/components/ui/Confirm';
import { Avatar, EmptyState, ErrorState, Segmented, Skeleton } from '@/components/ui/Bits';
import { api, partyBook } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { date, dayToISO, isoDay, money } from '@/lib/format';
import PartyForm from './PartyForm';
import { PARTY_WORDS } from '@/lib/words';

/**
 * Two ways to move a balance by hand:
 *  - "Record payment": the common case, worded from the shop's side.
 *  - "Adjustment": a raw debit or credit, for corrections.
 */
function EntryForm({ type, mode, party, open, onClose, onSaved }) {
  const isPayment = mode === 'payment';
  const payLabel = type === 'customer' ? 'Payment received' : 'Payment made';
  const [form, setForm] = useState({ amount: '', description: '', date: isoDay(), entryType: 'debit' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm({ amount: '', description: '', date: isoDay(), entryType: 'debit' });
      setError('');
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const entryType = isPayment ? (type === 'customer' ? 'credit' : 'debit') : form.entryType;
      await partyBook(type).addEntry(party._id, {
        entryType,
        amount: form.amount,
        date: dayToISO(form.date),
        description: form.description || (isPayment ? payLabel : 'Adjustment'),
      });
      toast.success(isPayment ? `${payLabel} recorded.` : 'Adjustment recorded.');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isPayment ? `${payLabel} · ${party?.name}` : `Adjust ${party?.name}’s account`}
      description={isPayment ? 'Not tied to one bill. To pay a specific bill, open it and record the payment there.' : 'Debit raises what a customer owes you; credit raises what you owe a supplier.'}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="entry-form" loading={busy}>
            {isPayment ? 'Record payment' : 'Record adjustment'}
          </Button>
        </>
      }
    >
      <form id="entry-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {!isPayment && (
          <Select className="sm:col-span-2" label="Type" value={form.entryType} onChange={(e) => setForm({ ...form, entryType: e.target.value })}>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </Select>
        )}
        <Input label="Amount" prefix="₹" type="number" min="0.01" step="0.01" inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input className="sm:col-span-2" label="Note" optional placeholder={isPayment ? 'e.g. UPI, cash, cheque no.' : 'Why the balance is changing'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {error && <p className="text-[13px] font-medium text-debit sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}

export default function PartyDetail({ type }) {
  const { id } = useParams();
  const w = PARTY_WORDS[type];
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tab, setTab] = useState('statement');
  const [editOpen, setEditOpen] = useState(false);
  const [entry, setEntry] = useState(null);
  const [downloading, setDownloading] = useState('');

  const detail = useApi(() => partyBook(type).get(id), [type, id]);
  const ledger = useApi(() => partyBook(type).ledger(id), [type, id]);
  const reload = () => {
    detail.reload();
    ledger.reload();
  };

  if (detail.error) return <div className="card"><ErrorState error={detail.error} onRetry={reload} /></div>;
  if (!detail.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-[14px]" />
        <Skeleton className="h-72 w-full rounded-[14px]" />
      </div>
    );
  }

  const { party, balance, transactions } = detail.data;
  const entries = ledger.data?.entries || [];
  const tradeBase = type === 'customer' ? 'sales' : 'purchases';

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${party.name}?`,
      body: `Only ${w.one}s with no bills or account entries can be deleted.`,
      action: `Delete ${w.one}`,
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await partyBook(type).remove(party._id);
      toast.success(`${w.One} deleted.`);
      navigate(`/${w.base}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const download = async (format) => {
    setDownloading(format);
    try {
      await api.reports.download('ledger', format, { party: party._id });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading('');
    }
  };

  const owes = balance.balance;

  return (
    <div className="animate-rise">
      <Link to={`/${w.base}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-quiet hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {w.many}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="card p-5 sm:p-6">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <Avatar name={party.name} src={party.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[12px] text-faint">
                {party.code} · {w.One}
              </p>
              <h1 className="break-words text-[24px] font-semibold leading-tight sm:text-[26px]">{party.name}</h1>
              {party.companyName && <p className="text-[14px] text-quiet">{party.companyName}</p>}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-quiet">
                {party.phone && (
                  <a href={`tel:${party.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                    <Phone className="h-3.5 w-3.5" /> <span className="figure">{party.phone}</span>
                  </a>
                )}
                {party.email && (
                  <a href={`mailto:${party.email}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                    <Mail className="h-3.5 w-3.5" /> {party.email}
                  </a>
                )}
                {party.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {party.address}
                  </span>
                )}
                {party.gstNumber && <span className="font-mono text-[12px]">GSTIN {party.gstNumber}</span>}
              </div>
            </div>
            <div className="absolute right-0 top-0 flex gap-2 sm:static">
              <Button variant="outline" size="icon" aria-label="Edit" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Delete" onClick={remove} className="hover:!border-debit/40 hover:!text-debit">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="card flex flex-col p-5">
          <p className="eyebrow">{owes === 0 ? 'Account' : type === 'customer' ? (owes > 0 ? 'Owes you' : 'Paid in advance') : owes > 0 ? 'You owe' : 'Advance with them'}</p>
          <p className={`figure mt-2 text-[32px] font-semibold leading-none ${owes > 0 ? 'text-debit' : owes < 0 ? 'text-credit' : 'text-ink'}`}>{money(Math.abs(owes))}</p>
          {owes === 0 && <p className="mt-1 text-[13px] text-quiet">Settled — nothing outstanding.</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-dashed border-rule-strong pt-3 text-[12.5px]">
            <div>
              <p className="text-faint">Debits</p>
              <p className="figure font-semibold">{money(balance.debit)}</p>
            </div>
            <div className="text-right">
              <p className="text-faint">Credits</p>
              <p className="figure font-semibold">{money(balance.credit)}</p>
            </div>
          </div>
          <div className="mt-auto flex gap-2 pt-4">
            <Button className="flex-1 justify-center" icon={IndianRupee} onClick={() => setEntry('payment')}>
              {type === 'customer' ? 'Payment in' : 'Payment out'}
            </Button>
            <Button variant="outline" size="icon" aria-label="Adjust account" title="Adjust account" onClick={() => setEntry('adjust')}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-3.5 sm:px-5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'statement', label: 'Statement', count: entries.length },
              { value: 'bills', label: 'Bills', count: transactions.length },
            ]}
          />
          <div className="ml-auto flex gap-2">
            {tab === 'statement' ? (
              ['pdf', 'xlsx'].map((f) => (
                <Button key={f} variant="ghost" size="sm" icon={Download} loading={downloading === f} onClick={() => download(f)}>
                  {f === 'pdf' ? 'PDF' : 'Excel'}
                </Button>
              ))
            ) : (
              <Button size="sm" icon={Plus} onClick={() => navigate(`/${tradeBase}/new?party=${party._id}`)}>
                New {type === 'customer' ? 'sale' : 'purchase'}
              </Button>
            )}
          </div>
        </div>

        {tab === 'statement' ? (
          entries.length === 0 ? (
            <EmptyState title="No entries yet" body={`Bills and payments for this ${w.one} will be listed here with a running balance.`} />
          ) : (
            <>
            <ul className="divide-y divide-rule/70 sm:hidden">
              {entries.map((e) => {
                const linked = e.reference?.id && ['sale', 'purchase'].includes(e.reference.kind);
                const Row = linked ? Link : 'div';
                return (
                  <li key={e._id}>
                    <Row {...(linked ? { to: `/${tradeBase}/${e.reference.id}` } : {})} className="flex items-center gap-3 px-4 py-3 transition active:bg-paper">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[14px] font-medium ${linked ? 'text-ink' : ''}`}>{e.description}</p>
                        <p className="figure text-[11.5px] text-faint">{date(e.date)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`figure text-[14px] font-semibold ${e.entryType === 'debit' ? 'text-debit' : 'text-credit'}`}>
                          {money(e.amount)} <span className="text-[10.5px] font-medium">{e.entryType === 'debit' ? 'Dr' : 'Cr'}</span>
                        </p>
                        <p className="figure text-[11.5px] text-faint">Bal {money(e.runningBalance)}</p>
                      </div>
                    </Row>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="table-ledger min-w-[680px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="w-[40%]">Description</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e._id}>
                      <td className="figure whitespace-nowrap text-[12.5px] text-quiet">{date(e.date)}</td>
                      <td>
                        {e.reference?.id && ['sale', 'purchase'].includes(e.reference.kind) ? (
                          <Link to={`/${tradeBase}/${e.reference.id}`} className="font-medium hover:text-stamp">
                            {e.description}
                          </Link>
                        ) : (
                          <span className="font-medium">{e.description}</span>
                        )}
                      </td>
                      <td className="figure text-right text-debit">{e.entryType === 'debit' ? money(e.amount) : ''}</td>
                      <td className="figure text-right text-credit">{e.entryType === 'credit' ? money(e.amount) : ''}</td>
                      <td className="figure text-right font-semibold">{money(e.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )
        ) : transactions.length === 0 ? (
          <EmptyState title="No bills yet" body={`${type === 'customer' ? 'Sales to' : 'Purchases from'} ${party.name} will be listed here.`} />
        ) : (
          <>
          <ul className="divide-y divide-rule/70 sm:hidden">
            {transactions.map((t) => (
              <li key={t._id}>
                <Link to={`/${tradeBase}/${t._id}`} className="flex items-center gap-3 px-4 py-3 transition active:bg-paper">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[13px] font-semibold">{t.invoiceNumber}</p>
                    <p className="figure text-[11.5px] text-faint">{date(t.date)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="figure text-[14px] font-semibold">{money(t.total)}</span>
                    {t.balanceDue > 0 ? <span className="figure text-[11.5px] font-semibold text-debit">{money(t.balanceDue)} due</span> : <Stamp status={t.paymentStatus} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="table-ledger min-w-[680px]">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Due</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id} className="row-link" onClick={() => navigate(`/${tradeBase}/${t._id}`)}>
                    <td className="font-mono text-[13px] font-semibold">{t.invoiceNumber}</td>
                    <td className="text-quiet">{date(t.date)}</td>
                    <td className="figure text-right">{money(t.total)}</td>
                    <td className={`figure text-right ${t.balanceDue > 0 ? 'text-debit' : 'text-faint'}`}>{money(t.balanceDue)}</td>
                    <td className="text-right">
                      <Stamp status={t.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <PartyForm type={type} open={editOpen} party={party} onClose={() => setEditOpen(false)} onSaved={reload} />
      <EntryForm type={type} mode={entry} party={party} open={Boolean(entry)} onClose={() => setEntry(null)} onSaved={reload} />
    </div>
  );
}

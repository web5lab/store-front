import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, IndianRupee, Paperclip, Printer, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import Stamp from '@/components/ui/Stamp';
import { ErrorState, Skeleton } from '@/components/ui/Bits';
import { api, tradeBook } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { date, dayToISO, isoDay, money, number } from '@/lib/format';
import { fileUrl, isNative } from '@/lib/platform';
import { APP_NAME } from '@/components/Logo';

function PaymentModal({ kind, invoice, open, onClose, onSaved }) {
  const sale = kind === 'sale';
  const [form, setForm] = useState({ amount: '', note: '', date: isoDay() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm({ amount: String(invoice.balanceDue), note: '', date: isoDay() });
      setError('');
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await tradeBook(kind).pay(invoice._id, { ...form, date: dayToISO(form.date) });
      toast.success(res.data.paymentStatus === 'Paid' ? `${invoice.invoiceNumber} is paid in full.` : 'Payment recorded.');
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
      title={sale ? 'Record payment received' : 'Record payment made'}
      description={`${invoice.invoiceNumber} · ${money(invoice.balanceDue)} due`}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="pay-form" loading={busy}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="pay-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount"
          prefix="₹"
          type="number"
          min="0.01"
          max={invoice.balanceDue}
          step="0.01"
          inputMode="decimal"
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          hint={Number(form.amount) < invoice.balanceDue ? `${money(invoice.balanceDue - (Number(form.amount) || 0))} will still be due` : 'Settles the bill'}
        />
        <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input className="sm:col-span-2" label="Note" optional placeholder="e.g. UPI ref, cash" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        {error && <p className="text-[13px] font-medium text-debit sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}

export default function InvoiceView({ kind }) {
  const { id } = useParams();
  const location = useLocation();
  const sale = kind === 'sale';
  const base = sale ? 'sales' : 'purchases';
  const { data: inv, error, reload } = useApi(() => tradeBook(kind).get(id), [kind, id]);
  const shopRes = useApi(() => api.shop.get(), []);
  const [payOpen, setPayOpen] = useState(false);

  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  if (!inv) return <Skeleton className="mx-auto h-[640px] max-w-3xl rounded-[14px]" />;

  const shop = shopRes.data || {};
  const party = inv.party;
  const units = inv.items.reduce((s, i) => s + i.quantity, 0);

  const shareText = [
    `${sale ? 'Invoice' : 'Purchase'} ${inv.invoiceNumber}${shop.shopName ? ` from ${shop.shopName}` : ''}`,
    `Date: ${date(inv.date)}`,
    ...inv.items.map((i) => `• ${i.name} × ${i.quantity} = ${money(i.total)}`),
    `Total: ${money(inv.total)}`,
    inv.balanceDue > 0 ? `Balance due: ${money(inv.balanceDue)}` : 'Paid in full. Thank you!',
  ].join('\n');
  const phone = (party?.phone || '').replace(/\D/g, '');
  const waPhone = phone.length === 10 ? `91${phone}` : phone;
  const whatsapp = `https://wa.me/${waPhone}?text=${encodeURIComponent(shareText)}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="animate-rise">
      <div className="no-print mx-auto mb-5 flex max-w-3xl flex-wrap items-center gap-2">
        <Link to={`/${base}`} className="mr-auto inline-flex w-full items-center gap-1.5 text-[13px] font-semibold text-quiet hover:text-ink sm:w-auto">
          <ArrowLeft className="h-4 w-4" /> {sale ? 'Sales' : 'Purchases'}
        </Link>
        {inv.balanceDue > 0 && (
          <Button icon={IndianRupee} className="w-full sm:w-auto" onClick={() => setPayOpen(true)}>
            Record payment
          </Button>
        )}
        {!isNative && (
          <Button variant="outline" icon={Printer} className="flex-1 sm:flex-none" onClick={() => window.print()}>
            Print
          </Button>
        )}
        {sale && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" icon={Send} className="w-full">
              WhatsApp
            </Button>
          </a>
        )}
        <a href={telegram} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
          <Button variant="ghost" className="w-full">
            Telegram
          </Button>
        </a>
      </div>

      <article className="slip mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-10 sm:pt-7">
        {/* Header */}
        <header className="flex flex-col gap-6 border-b-2 border-ink pb-6 sm:flex-row sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold">{shop.shopName || APP_NAME}</h1>
            {shop.address && <p className="mt-1 max-w-xs whitespace-pre-line text-[12.5px] text-quiet">{shop.address}</p>}
            <p className="mt-1 text-[12.5px] text-quiet">{[shop.phone, shop.email].filter(Boolean).join(' · ')}</p>
            {shop.gstNumber && <p className="mt-1 font-mono text-[12px] text-quiet">GSTIN {shop.gstNumber}</p>}
            {!shop.shopName && (
              <Link to="/settings" className="no-print mt-2 inline-block text-[12px] font-semibold text-stamp hover:underline">
                Add your shop name and GSTIN →
              </Link>
            )}
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">{sale ? (inv.gstPercent > 0 ? 'Tax invoice' : 'Invoice') : 'Purchase bill'}</p>
            <p className="figure mt-1 text-[22px] font-semibold">{inv.invoiceNumber}</p>
            <p className="figure mt-1 text-[13px] text-quiet">{date(inv.date)}</p>
          </div>
        </header>

        {/* Party */}
        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="eyebrow">{sale ? 'Billed to' : 'Supplied by'}</p>
            {party ? (
              <>
                <Link to={`/${sale ? 'customers' : 'suppliers'}/${party._id}`} className="mt-1.5 block text-[16px] font-semibold hover:text-stamp">
                  {party.name}
                </Link>
                {party.companyName && <p className="text-[13px] text-quiet">{party.companyName}</p>}
                {party.address && <p className="text-[13px] text-quiet">{party.address}</p>}
                <p className="text-[13px] text-quiet">{[party.phone, party.email].filter(Boolean).join(' · ')}</p>
                {party.gstNumber && <p className="font-mono text-[12px] text-quiet">GSTIN {party.gstNumber}</p>}
                <p className="mt-0.5 font-mono text-[11.5px] text-faint">{party.code}</p>
              </>
            ) : (
              <p className="mt-1.5 text-[16px] font-semibold">{sale ? 'Walk-in customer' : 'Unnamed supplier'}</p>
            )}
          </div>
          {inv.createdBy && (
            <div className="sm:text-right">
              <p className="eyebrow">Billed by</p>
              <p className="mt-1.5 text-[14px] font-medium">{inv.createdBy.fullName || inv.createdBy.username}</p>
            </div>
          )}
        </section>

        {/* Items */}
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-[13.5px] sm:min-w-[520px]">
            <thead>
              <tr className="border-y border-rule text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                <th className="hidden px-2 py-2 font-medium sm:table-cell">#</th>
                <th className="px-2 py-2 font-medium">Item</th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Rate</th>
                <th className="px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i} className="border-b border-dashed border-rule">
                  <td className="figure hidden px-2 py-3 text-faint sm:table-cell">{i + 1}</td>
                  <td className="px-2 py-3">
                    <p className="font-semibold">{item.name}</p>
                    <p className="font-mono text-[11px] text-faint">{item.code}</p>
                  </td>
                  <td className="figure px-2 py-3 text-right">
                    {number(item.quantity)} <span className="text-[11px] text-faint">{item.unit}</span>
                    <span className="block text-[11px] text-faint sm:hidden">@ {money(item.price)}</span>
                  </td>
                  <td className="figure hidden px-2 py-3 text-right sm:table-cell">{money(item.price)}</td>
                  <td className="figure px-2 py-3 text-right font-semibold">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals with the stamp */}
        <section className="mt-6 flex flex-col-reverse gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center justify-center py-2 sm:w-1/2 sm:justify-start sm:pl-4">
            <Stamp status={inv.paymentStatus} size="lg" tilt={-8} animate={Boolean(location.state?.fresh)} />
          </div>
          <dl className="w-full space-y-2 text-[13.5px] sm:w-72">
            <div className="flex justify-between">
              <dt className="text-quiet">Subtotal · {number(units)} units</dt>
              <dd className="figure">{money(inv.subtotal)}</dd>
            </div>
            {inv.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-quiet">Discount</dt>
                <dd className="figure">−{money(inv.discount)}</dd>
              </div>
            )}
            {inv.gstPercent > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-quiet">CGST {inv.gstPercent / 2}%</dt>
                  <dd className="figure">{money(inv.tax / 2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-quiet">SGST {inv.gstPercent / 2}%</dt>
                  <dd className="figure">{money(inv.tax / 2)}</dd>
                </div>
              </>
            )}
            <div className="flex items-end justify-between border-t-2 border-ink pt-2.5">
              <dt className="font-display text-[16px] font-semibold">Total</dt>
              <dd className="figure text-[24px] font-semibold leading-none">{money(inv.total)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-quiet">{sale ? 'Received' : 'Paid'}</dt>
              <dd className="figure text-credit">{money(inv.amountReceived)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold">Balance due</dt>
              <dd className={`figure font-semibold ${inv.balanceDue > 0 ? 'text-debit' : ''}`}>{money(inv.balanceDue)}</dd>
            </div>
          </dl>
        </section>

        {inv.payments?.length > 0 && (
          <section className="mt-8 border-t border-dashed border-rule-strong pt-5">
            <p className="eyebrow mb-2">Payments</p>
            <ul className="space-y-1.5 text-[13px]">
              {inv.payments.map((p) => (
                <li key={p._id} className="flex justify-between gap-4">
                  <span className="text-quiet">
                    <span className="figure">{date(p.date)}</span>
                    {p.note ? ` · ${p.note}` : ''}
                  </span>
                  <span className="figure font-medium">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(inv.notes || inv.attachment?.url) && (
          <section className="mt-6 border-t border-dashed border-rule-strong pt-5 text-[13px]">
            {inv.notes && <p className="whitespace-pre-line text-quiet">{inv.notes}</p>}
            {inv.attachment?.url && (
              <a href={fileUrl(inv.attachment.url)} target="_blank" rel="noreferrer" className="no-print mt-2 inline-flex items-center gap-1.5 font-semibold text-stamp hover:underline">
                <Paperclip className="h-3.5 w-3.5" /> {inv.attachment.name || 'Attachment'}
              </a>
            )}
          </section>
        )}

        {shop.invoiceFooter && sale && <p className="mt-10 text-center text-[12.5px] text-faint">{shop.invoiceFooter}</p>}
      </article>

      <PaymentModal kind={kind} invoice={inv} open={payOpen} onClose={() => setPayOpen(false)} onSaved={reload} />
    </div>
  );
}

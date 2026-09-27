import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import FileDrop from '@/components/ui/FileDrop';
import { partyBook } from '@/lib/api';
import { PARTY_WORDS } from '@/lib/words';

const blank = { name: '', code: '', companyName: '', phone: '', email: '', gstNumber: '', address: '', openingBalance: '' };

/** What someone typed into a search box, read as either a phone number or a name. */
// oxlint-disable-next-line react/only-export-components
export const partySeed = (text = '') => {
  const t = text.trim();
  return /^[+\d][\d\s-]{5,}$/.test(t) ? { phone: t } : { name: t };
};

/** `initial` prefills a new record, e.g. the name typed while billing. */
export default function PartyForm({ type, open, party, initial, onClose, onSaved }) {
  const w = PARTY_WORDS[type];
  const [form, setForm] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /* Refill the fields each time the dialog opens. */
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setError('');
      setPhoto(null);
      setRemovePhoto(false);
      setForm(party ? Object.fromEntries(Object.keys(blank).map((k) => [k, String(party[k] ?? '')])) : { ...blank, ...initial });
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const values = { ...form, photo: photo || undefined, removePhoto: removePhoto && !photo ? 'true' : undefined };
      if (!values.code) delete values.code;
      const book = partyBook(type);
      const res = party ? await book.update(party._id, values) : await book.create(values);
      toast.success(res.message);
      onSaved?.(res.data);
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
      title={party ? `Edit ${party.name}` : `Add a ${w.one}`}
      width="max-w-2xl"
      description={party ? undefined : initial ? 'Only the name is needed. Fill the rest in later if you like.' : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="party-form" loading={busy}>
            {party ? `Save ${w.one}` : `Add ${w.one}`}
          </Button>
        </>
      }
    >
      <form id="party-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={set('name')} required autoComplete="off" enterKeyHint="next" />
        <Input label="Phone" optional type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
        <Input label="Business name" optional value={form.companyName} onChange={set('companyName')} />
        <Input label="Email" optional type="email" value={form.email} onChange={set('email')} />
        <Input label="GSTIN" optional value={form.gstNumber} onChange={set('gstNumber')} placeholder="15 characters" className="[&_input]:font-mono [&_input]:uppercase" maxLength={15} />
        <Input label={`${w.One} code`} optional value={form.code} onChange={set('code')} placeholder="Auto" hint={party ? undefined : `Left blank: ${type === 'customer' ? 'CUS' : 'SUP'}-000…`} />
        <Textarea className="sm:col-span-2" label="Address" optional value={form.address} onChange={set('address')} rows={2} />
        <Input label={w.opening} prefix="₹" type="number" min="0" step="0.01" inputMode="decimal" value={form.openingBalance} onChange={set('openingBalance')} hint={w.openingHint} />
        <FileDrop label="Photo" value={photo} onChange={setPhoto} existingUrl={!removePhoto ? party?.photoUrl : ''} onRemoveExisting={() => setRemovePhoto(true)} hint="JPG or PNG" />
        {error && (
          <p className="rounded-[10px] bg-debit-soft px-3 py-2.5 text-[13px] font-medium text-debit sm:col-span-2" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

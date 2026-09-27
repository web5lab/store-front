import { useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Plus, UserRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Avatar, PageHeader, Skeleton } from '@/components/ui/Bits';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { date } from '@/lib/format';
import { isAdminSelector, userSelector } from '@/store/global.Selector';

function Section({ title, description, children }) {
  return (
    <section className="grid gap-5 border-t border-rule py-8 first:border-t-0 first:pt-0 lg:grid-cols-[280px_1fr]">
      <div>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-quiet">{description}</p>
      </div>
      <div className="card p-5">{children}</div>
    </section>
  );
}

function ShopForm({ admin }) {
  const { data } = useApi(() => api.shop.get(), []);
  if (!data) return <Skeleton className="h-48 w-full" />;
  return <ShopFields admin={admin} initial={data} />;
}

function ShopFields({ admin, initial }) {
  const [form, setForm] = useState(() => ({
    shopName: initial.shopName,
    address: initial.address,
    phone: initial.phone,
    email: initial.email,
    gstNumber: initial.gstNumber,
    invoiceFooter: initial.invoiceFooter,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.shop.update(form);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={!admin} className="contents">
        <Input className="sm:col-span-2" label="Shop name" value={form.shopName} onChange={set('shopName')} placeholder="As printed on bills" />
        <Textarea className="sm:col-span-2" label="Address" value={form.address} onChange={set('address')} rows={2} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <Input label="GSTIN" value={form.gstNumber} onChange={set('gstNumber')} maxLength={15} className="[&_input]:font-mono [&_input]:uppercase" />
        <Input label="Line at the bottom of bills" value={form.invoiceFooter} onChange={set('invoiceFooter')} />
      </fieldset>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        {!admin && <p className="mr-auto text-[12.5px] text-faint">Only an administrator can change these.</p>}
        <Button type="submit" loading={busy} disabled={!admin}>
          Save shop details
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const mismatch = form.confirm && form.confirm !== form.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    try {
      await api.auth.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Input className="sm:col-span-2" label="Current password" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      <Input label="New password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
      <Input label="Repeat new password" type="password" autoComplete="new-password" required error={mismatch ? 'Does not match' : undefined} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" variant="ink" loading={busy}>
          Change password
        </Button>
      </div>
    </form>
  );
}

function StaffAccounts() {
  const me = useSelector(userSelector);
  const { data, loading, reload } = useApi(() => api.auth.users(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', fullName: '', password: '', role: 'staff' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.auth.createUser(form);
      toast.success(`${form.username} can now sign in.`);
      setOpen(false);
      setForm({ username: '', fullName: '', password: '', role: 'staff' });
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (user, body, message) => {
    try {
      await api.auth.updateUser(user._id, body);
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetPassword = (user) => {
    const password = window.prompt(`New password for ${user.username} (at least 8 characters)`);
    if (password) update(user, { password }, `Password reset for ${user.username}.`);
  };

  return (
    <>
      {loading && !data ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ul className="divide-y divide-rule">
          {data.map((u) => {
            const self = u._id === me?._id;
            return (
              <li key={u._id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                <Avatar name={u.fullName || u.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {u.fullName || u.username} {self && <span className="text-[12px] font-normal text-faint">(you)</span>}
                  </p>
                  <p className="font-mono text-[11.5px] text-faint">
                    {u.username} · since {date(u.createdAt)}
                  </p>
                </div>
                <select
                  aria-label={`Role for ${u.username}`}
                  className="input h-8 w-28 py-0 text-[12.5px]"
                  value={u.role}
                  disabled={self}
                  onChange={(e) => update(u, { role: e.target.value }, `${u.username} is now ${e.target.value}.`)}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => resetPassword(u)}>
                  Reset password
                </Button>
                <Button
                  variant={u.isActive ? 'danger-ghost' : 'outline'}
                  size="sm"
                  disabled={self}
                  onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? `${u.username} can no longer sign in.` : `${u.username} can sign in again.`)}
                >
                  {u.isActive ? 'Deactivate' : 'Reactivate'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="outline" size="sm" icon={Plus} className="mt-3" onClick={() => setOpen(true)}>
        Add staff account
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a staff account"
        width="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" loading={busy}>
              Add account
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={create} className="grid gap-4">
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Username" required autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} hint="Letters, numbers, dots and dashes" />
          <Input label="Password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Share it with them privately; they can change it after signing in." />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} hint="Admins can also manage accounts and shop details.">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
          {error && <p className="text-[13px] font-medium text-debit">{error}</p>}
        </form>
      </Modal>
    </>
  );
}

export default function Settings() {
  const admin = useSelector(isAdminSelector);
  const user = useSelector(userSelector);
  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Settings" title="Shop and accounts" />
      <Section title="Shop details" description="Printed at the top of every bill you share or print.">
        <ShopForm admin={admin} />
      </Section>
      <Section title="Your password" description={`Signed in as ${user?.username}.`}>
        <PasswordForm />
      </Section>
      {admin && (
        <Section title="Staff accounts" description="Everyone who can sign in. Deactivated accounts are signed out straight away.">
          <StaffAccounts />
        </Section>
      )}
      {!admin && (
        <p className="flex items-center gap-2 text-[13px] text-quiet">
          <UserRound className="h-4 w-4" /> Ask an administrator to add or change staff accounts.
        </p>
      )}
    </div>
  );
}

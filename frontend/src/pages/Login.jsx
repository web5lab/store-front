import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import Stamp from '@/components/ui/Stamp';
import { Login as LoginAction } from '@/store/global.Action';
import { userSelector } from '@/store/global.Selector';

/** A bill slip, drawn in type, with the stamp landing on it. */
function SlipIllustration() {
  const lines = [
    ['Cotton shirt · M', '2', '1,398.00'],
    ['Denim jeans · 32', '1', '1,899.00'],
    ['Leather belt', '1', '549.00'],
  ];
  return (
    <div className="slip w-full max-w-[360px] rotate-[-2deg] px-6 pb-6 pt-5 text-ink">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Tax invoice</p>
          <p className="figure mt-1 text-[15px] font-semibold">SAL-000248</p>
        </div>
        <p className="figure text-[12px] text-quiet">27 Sep 2026</p>
      </div>
      <div className="mt-5 space-y-2 border-y border-dashed border-rule-strong py-3">
        {lines.map(([name, qty, amt]) => (
          <div key={name} className="flex items-baseline gap-2 text-[13px]">
            <span className="flex-1 truncate">{name}</span>
            <span className="figure w-6 text-right text-quiet">×{qty}</span>
            <span className="figure w-20 text-right">{amt}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <Stamp status="Paid" size="lg" tilt={-9} animate />
        <div className="text-right">
          <p className="eyebrow">Total</p>
          <p className="figure text-[22px] font-semibold">₹3,846.00</p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(userSelector);
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && localStorage.getItem('authToken')) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await dispatch(LoginAction(form));
    setBusy(false);
    if (LoginAction.fulfilled.match(result)) navigate(location.state?.from || '/', { replace: true });
    else setError(result.payload || 'Sign-in failed.');
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* ruled ledger lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 36px)' }} />
        <div className="pointer-events-none absolute inset-y-0 left-[88px] w-px bg-debit/50" />
        <Logo light className="relative" />
        <div className="relative flex flex-1 items-center justify-center py-10">
          <SlipIllustration />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-[34px] font-semibold leading-[1.1] text-white">Every unit on the shelf. Every rupee in the book.</h2>
          <p className="mt-3 text-[15px] text-white/60">Billing, stock and customer accounts that stay in step with each other — a sale takes the stock off the shelf and puts the balance on the customer’s page.</p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-paper px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-[380px] animate-rise">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-[28px] font-semibold">Sign in</h1>
          <p className="mt-1 text-[14px] text-quiet">Use the account your administrator gave you.</p>

          <div className="mt-8 space-y-4">
            <Input label="Username" autoComplete="username" autoFocus value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-lg text-faint hover:text-ink"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="mt-4 rounded-[10px] bg-debit-soft px-3 py-2.5 text-[13px] font-medium text-debit" role="alert">{error}</p>}

          <Button type="submit" size="lg" className="mt-6 w-full justify-center" loading={busy}>
            Sign in <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}

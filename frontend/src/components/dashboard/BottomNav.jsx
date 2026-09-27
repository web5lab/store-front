import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { BarChart3, BookOpenCheck, Boxes, LayoutGrid, LogOut, Menu, PackagePlus, Plus, ReceiptText, Settings, ShoppingBag, Tags, Truck, UserPlus, Users, X } from 'lucide-react';
import { logout } from '@/store/global.Slice';

/* Four places a shopkeeper goes all day, with "new bill" under the thumb. */
const TABS = [
  { to: '/', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/sales', label: 'Sales', icon: ReceiptText },
  null, // the + button
  { to: '/products', label: 'Stock', icon: Boxes },
];

const QUICK = [
  { to: '/sales/new', label: 'New sale', sub: 'Bill a customer · stock goes out', icon: ReceiptText, tone: 'bg-stamp text-white' },
  { to: '/purchases/new', label: 'Purchase', sub: 'Stock in', icon: ShoppingBag, tone: 'bg-[#e0f3f0] text-[#137a6e]' },
  { to: '/products?new=1', label: 'Product', sub: 'Add item', icon: PackagePlus, tone: 'bg-kraft-soft text-kraft-deep' },
  { to: '/customers?new=1', label: 'Customer', sub: 'You sell to', icon: UserPlus, tone: 'bg-stamp-soft text-stamp' },
  { to: '/suppliers?new=1', label: 'Supplier', sub: 'You buy from', icon: Truck, tone: 'bg-paper-2 text-ink-2' },
];

const MORE = [
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/purchases', label: 'Purchases', icon: ShoppingBag },
  { to: '/accounts', label: 'Accounts', icon: BookOpenCheck },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end lg:hidden">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full animate-sheet rounded-t-[22px] bg-surface pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-rule-strong" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-paper text-quiet">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Phone navigation: thumb-reach tabs, a raised + for new records, the rest under More. */
export default function BottomNav() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [sheet, setSheet] = useState(null); // 'add' | 'more' | null

  const go = (to) => {
    setSheet(null);
    navigate(to);
  };
  const moreActive = MORE.some((m) => pathname.startsWith(m.to));
  const tab = 'flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10.5px] font-semibold tracking-wide transition';

  return (
    <>
      <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex h-16 max-w-md items-stretch px-1">
          {TABS.map((t) =>
            t ? (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `${tab} ${isActive ? 'text-stamp' : 'text-faint'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-full transition ${isActive ? 'bg-stamp-soft' : ''}`}>
                      <t.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.3 : 1.9} />
                    </span>
                    {t.label}
                  </>
                )}
              </NavLink>
            ) : (
              <div key="add" className="flex flex-1 items-start justify-center">
                <button
                  type="button"
                  aria-label="Create new"
                  aria-expanded={sheet === 'add'}
                  onClick={() => setSheet(sheet === 'add' ? null : 'add')}
                  className="-mt-5 grid h-14 w-14 place-items-center rounded-[18px] bg-stamp text-white shadow-[0_10px_24px_-8px_rgb(63_61_188/0.8)] ring-4 ring-paper transition active:scale-95"
                >
                  <Plus className={`h-6 w-6 transition-transform ${sheet === 'add' ? 'rotate-45' : ''}`} strokeWidth={2.6} />
                </button>
              </div>
            )
          )}
          <button type="button" onClick={() => setSheet('more')} className={`${tab} ${moreActive ? 'text-stamp' : 'text-faint'}`} aria-expanded={sheet === 'more'}>
            <span className={`grid h-7 w-12 place-items-center rounded-full ${moreActive ? 'bg-stamp-soft' : ''}`}>
              <Menu className="h-[19px] w-[19px]" strokeWidth={moreActive ? 2.3 : 1.9} />
            </span>
            More
          </button>
        </div>
      </nav>

      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Create">
        <div className="grid grid-cols-2 gap-2.5 px-4 pt-1">
          {QUICK.map((q, i) => (
            <button
              key={q.to}
              type="button"
              onClick={() => go(q.to)}
              className={`flex items-center gap-3 rounded-[14px] border border-rule p-3 text-left transition active:scale-[0.98] active:bg-paper ${i === 0 ? 'col-span-2' : ''}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${q.tone}`}>
                <q.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold">{q.label}</span>
                <span className="block truncate text-[12px] text-quiet">{q.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title="More">
        <div className="grid grid-cols-3 gap-2 px-4 pt-1">
          {MORE.map((m) => {
            const active = pathname.startsWith(m.to);
            return (
              <button
                key={m.to}
                type="button"
                onClick={() => go(m.to)}
                className={`flex flex-col items-center gap-2 rounded-[14px] px-2 py-3.5 text-[12.5px] font-semibold transition active:scale-[0.97] ${active ? 'bg-stamp-soft text-stamp' : 'bg-paper text-ink-2'}`}
              >
                <m.icon className="h-5 w-5" strokeWidth={1.9} />
                {m.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="flex flex-col items-center gap-2 rounded-[14px] bg-debit-soft px-2 py-3.5 text-[12.5px] font-semibold text-debit transition active:scale-[0.97]"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.9} />
            Sign out
          </button>
        </div>
      </Sheet>
    </>
  );
}

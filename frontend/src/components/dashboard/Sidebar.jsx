import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart3, BookOpenCheck, Boxes, LayoutGrid, LogOut, Plus, Settings, ShoppingBag, Tags, Truck, Users, X, ReceiptText } from 'lucide-react';
import Logo from '@/components/Logo';
import { Avatar } from '@/components/ui/Bits';
import { userSelector } from '@/store/global.Selector';
import { logout } from '@/store/global.Slice';

/* Grouped the way a shop thinks about its day: money moving, goods on the
   shelf, the people on either side, and the books at the end. */
const GROUPS = [
  { label: null, items: [{ to: '/', label: 'Overview', icon: LayoutGrid, end: true }] },
  {
    label: 'Trade',
    items: [
      { to: '/sales', label: 'Sales', icon: ReceiptText },
      { to: '/purchases', label: 'Purchases', icon: ShoppingBag },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: '/products', label: 'Products', icon: Boxes },
      { to: '/categories', label: 'Categories', icon: Tags },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    label: 'Books',
    items: [
      { to: '/accounts', label: 'Accounts', icon: BookOpenCheck },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const user = useSelector(userSelector);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <nav className="flex h-full w-[248px] flex-col bg-ink text-white" aria-label="Main">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Logo light />
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => {
            navigate('/sales/new');
            onClose?.();
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-stamp font-semibold text-white shadow-[0_8px_20px_-10px_rgb(63_61_188)] transition hover:bg-[#4a48d0] active:translate-y-px"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} /> New sale
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="mt-3 first:mt-1">
            {group.label && <p className="px-3 pb-1.5 pt-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">{group.label}</p>}
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition ${
                    isActive ? 'bg-white/[0.09] text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#8c8af0]" />}
                    <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#b3b1ff]' : 'text-white/45 group-hover:text-white/80'}`} strokeWidth={1.9} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => `flex items-center gap-3 rounded-[10px] px-2 py-2 transition ${isActive ? 'bg-white/[0.09]' : 'hover:bg-white/[0.05]'}`}
        >
          <Avatar name={user?.fullName || user?.username} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{user?.fullName || user?.username}</p>
            <p className="truncate font-mono text-[10.5px] uppercase tracking-wider text-white/40">{user?.role}</p>
          </div>
          <Settings className="h-4 w-4 text-white/40" />
        </NavLink>
        <button
          type="button"
          onClick={() => dispatch(logout())}
          className="mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </nav>
  );
}

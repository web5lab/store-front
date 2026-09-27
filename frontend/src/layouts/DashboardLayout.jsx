import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '@/components/dashboard/Sidebar';
import BottomNav from '@/components/dashboard/BottomNav';
import Logo from '@/components/Logo';
import { Avatar } from '@/components/ui/Bits';
import { userSelector } from '@/store/global.Selector';

/**
 * The workspace shell: a fixed ink sidebar and one scrolling column on
 * desktop. On phones and tablets the sidebar gives way to a slim top bar and a
 * bottom tab bar within thumb reach. Writing a bill hides the tab bar so the
 * bill's own save bar owns the bottom of the screen.
 */
export default function DashboardLayout() {
  const { pathname } = useLocation();
  const user = useSelector(userSelector);
  const billing = /^\/(sales|purchases)\/new/.test(pathname);

  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-paper">
      <div className="no-print hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 border-b border-rule bg-surface/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
          <Link to="/settings" aria-label="Settings" className="rounded-full ring-offset-2 transition active:scale-95">
            <Avatar name={user?.fullName || user?.username} size="sm" />
          </Link>
        </header>

        <div id="main-scroll" className="flex-1 overflow-y-auto overscroll-contain">
          <div className={`mx-auto w-full max-w-[1320px] px-4 pt-5 sm:px-6 lg:px-10 lg:pb-9 lg:pt-9 ${billing ? 'pb-28' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'}`}>
            <Outlet />
          </div>
        </div>
      </main>

      {!billing && <BottomNav />}
    </div>
  );
}

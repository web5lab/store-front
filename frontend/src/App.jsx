import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Products = lazy(() => import('@/pages/products/Products'));
const Categories = lazy(() => import('@/pages/Categories'));
const Parties = lazy(() => import('@/pages/parties/Parties'));
const PartyDetail = lazy(() => import('@/pages/parties/PartyDetail'));
const Transactions = lazy(() => import('@/pages/transactions/Transactions'));
const NewTransaction = lazy(() => import('@/pages/transactions/NewTransaction'));
const InvoiceView = lazy(() => import('@/pages/transactions/InvoiceView'));
const Accounts = lazy(() => import('@/pages/Accounts'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const Loading = () => (
  <div className="grid min-h-[50vh] place-items-center">
    <Loader2 className="h-5 w-5 animate-spin text-stamp" />
  </div>
);

/** Each page loads on first visit, with one shared spinner while it does. */
const page = (element) => <Suspense fallback={<Loading />}>{element}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={page(<Dashboard />)} />
        <Route path="/products" element={page(<Products />)} />
        <Route path="/categories" element={page(<Categories />)} />
        <Route path="/customers" element={page(<Parties type="customer" key="customer" />)} />
        <Route path="/customers/:id" element={page(<PartyDetail type="customer" key="customer-detail" />)} />
        <Route path="/suppliers" element={page(<Parties type="supplier" key="supplier" />)} />
        <Route path="/suppliers/:id" element={page(<PartyDetail type="supplier" key="supplier-detail" />)} />
        <Route path="/sales" element={page(<Transactions kind="sale" key="sales" />)} />
        <Route path="/sales/new" element={page(<NewTransaction kind="sale" key="new-sale" />)} />
        <Route path="/sales/:id" element={page(<InvoiceView kind="sale" key="sale-view" />)} />
        <Route path="/purchases" element={page(<Transactions kind="purchase" key="purchases" />)} />
        <Route path="/purchases/new" element={page(<NewTransaction kind="purchase" key="new-purchase" />)} />
        <Route path="/purchases/:id" element={page(<InvoiceView kind="purchase" key="purchase-view" />)} />
        <Route path="/accounts" element={page(<Accounts />)} />
        <Route path="/reports" element={page(<Reports />)} />
        <Route path="/settings" element={page(<Settings />)} />
        <Route path="*" element={page(<NotFound />)} />
      </Route>
    </Routes>
  );
}

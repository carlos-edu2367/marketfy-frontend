import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

import PlanGuard from './components/route/PlanGuard';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Plans from './pages/auth/Plans';
import AdminLayout from './components/layout/AdminLayout';
import SaaSLayout from './components/layout/SaaSLayout';
import NotFound from './pages/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const MarketDashboard = React.lazy(() => import('./pages/dashboard/MarketDashboard'));
const SalesHistory = React.lazy(() => import('./pages/dashboard/SalesHistory'));
const Financial = React.lazy(() => import('./pages/dashboard/Financial'));
const Inventory = React.lazy(() => import('./pages/dashboard/Inventory'));
const Customers = React.lazy(() => import('./pages/dashboard/Customers'));
const Settings = React.lazy(() => import('./pages/dashboard/Settings'));
const PDV = React.lazy(() => import('./pages/pdv/Pdv'));
const FiscalCredits = React.lazy(() => import('./pages/FiscalCredits'));
const CreditPaymentReturn = React.lazy(() => import('./pages/CreditPaymentReturn'));
const Support = React.lazy(() => import('./pages/support/Support'));
const SaaSAdminDashboard = React.lazy(() => import('./pages/admin/SaaSAdminDashboard'));
const PlansManagement = React.lazy(() => import('./pages/admin/PlansManagement'));
const AdminTickets = React.lazy(() => import('./pages/admin/AdminTickets'));

const FullPageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-gray-50">
    <Loader2 className="animate-spin text-brand-yellow" size={48} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

const Forbidden = () => (
  <div className="h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-md text-center">
      <h1 className="text-2xl font-black text-gray-900 mb-2">Acesso negado</h1>
      <p className="text-gray-500 mb-6">Sua conta nao tem permissao para abrir esta area.</p>
      <a href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 font-bold">
        Voltar ao dashboard
      </a>
    </div>
  </div>
);

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Forbidden />;

  return children;
};

const AppRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Home />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/" element={<AppRedirect />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/plans" element={<Plans />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="market/:marketId" element={<MarketDashboard />} />
              <Route path="history" element={<SalesHistory />} />
              <Route
                path="financial"
                element={
                  <PlanGuard>
                    <Financial />
                  </PlanGuard>
                }
              />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="settings" element={<Settings />} />
              <Route path="support" element={<Support />} />
            </Route>

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <SaaSLayout />
                </AdminRoute>
              }
            >
              <Route index element={<SaaSAdminDashboard />} />
              <Route path="plans" element={<PlansManagement />} />
              <Route path="tickets" element={<AdminTickets />} />
            </Route>

            <Route
              path="/pdv/:marketId"
              element={
                <ProtectedRoute>
                  <PDV />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fiscal/credits"
              element={
                <ProtectedRoute>
                  <FiscalCredits />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fiscal/credits/return"
              element={
                <ProtectedRoute>
                  <CreditPaymentReturn />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

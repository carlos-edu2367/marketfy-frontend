import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// --- GUARDS ----
import PlanGuard from './components/route/PlanGuard';

// --- PÁGINAS PÚBLICAS & ONBOARDING ----
import Home from './pages/Home'; 
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Plans from './pages/auth/Plans';

// --- ÁREA DO CLIENTE (TENANT) ---
import Dashboard from './pages/dashboard/Dashboard';
import MarketDashboard from './pages/dashboard/MarketDashboard';
import SalesHistory from './pages/dashboard/SalesHistory';
import Financial from './pages/dashboard/Financial';
import Inventory from './pages/dashboard/Inventory';
import Customers from './pages/dashboard/Customers';
import Settings from './pages/dashboard/Settings'; 
import PDV from './pages/pdv/Pdv';
import Support from './pages/support/Support';
import AdminLayout from './components/layout/AdminLayout';

// --- ÁREA ADMIN SAAS (GOD MODE) ---
import SaaSLayout from './components/layout/SaaSLayout';
import SaaSAdminDashboard from './pages/admin/SaaSAdminDashboard';
import PlansManagement from './pages/admin/PlansManagement';
import AdminTickets from './pages/admin/AdminTickets';
import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-brand-yellow" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Rota de Redirecionamento Inteligente
const AppRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) return <Navigate to={user.role === 'super_admin' ? "/admin" : "/dashboard"} replace />;
    return <Home />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root */}
          <Route path="/" element={<AppRedirect />} />
          
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/plans" element={<Plans />} />

          {/* 1. ÁREA DO CLIENTE (Layout Comum) */}
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
            
            {/* Rotas Globais ou Contextualizadas */}
            <Route path="history" element={<SalesHistory />} />
            
            {/* ROTA PROTEGIDA POR PLANO (PRO) */}
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

          {/* 2. ADMIN SAAS */}
          <Route 
            path="/admin"
            element={
              <ProtectedRoute>
                <SaaSLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SaaSAdminDashboard />} />
            <Route path="plans" element={<PlansManagement />} />
            <Route path="tickets" element={<AdminTickets />} />
          </Route>

          {/* 3. PDV (Tela Cheia, sem Layout) */}
          <Route 
            path="/pdv/:marketId" 
            element={
              <ProtectedRoute>
                <PDV />
              </ProtectedRoute>
            } 
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

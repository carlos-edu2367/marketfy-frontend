import React, { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../hooks/useSync';
import { 
  LogOut, Wifi, WifiOff, LayoutDashboard, Package, Users, 
  Settings, LifeBuoy, ShoppingBag, PieChart, RefreshCw, CloudOff, 
  CheckCircle, AlertTriangle, Crown, Calendar, Lock, AlertCircle, XCircle
} from 'lucide-react';
import clsx from 'clsx';
import { differenceInDays, parseISO } from 'date-fns';
import WelcomeModal from '../onboarding/WelcomeModal';
import { Button } from '../ui/Button';

export default function AdminLayout() {
  const { user, logout, refreshUser, loading: authLoading } = useAuth();
  
  // Extraindo novos hooks de falha
  const { isOnline, pendingSalesCount, failedSalesCount, isSyncing, syncSales, reportFailedSales, reporting } = useSync();
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isOnline) {
        refreshUser();
    }
  }, [isOnline, refreshUser]);

  const { daysLeft, isExpired, hasNoPlan } = useMemo(() => {
      let days = 0;
      let expired = false;
      let noPlan = false;

      if (user) {
          if (!user.plan_id && !user.plan_name) noPlan = true;
          if (user.plan_expiration) {
              try {
                  days = differenceInDays(parseISO(user.plan_expiration), new Date());
              } catch (e) { days = 0; }
          } else { days = 999; }
          if (user.is_active === false || (user.plan_expiration && days < 0)) expired = true;
      }
      return { daysLeft: days, isExpired: expired, hasNoPlan: noPlan };
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
        const isPlansPage = location.pathname.includes('/plans');
        if (hasNoPlan && !isPlansPage) {
            navigate('/plans');
            return;
        }
        const isAllowedExpired = isPlansPage || 
            location.pathname.includes('/dashboard/settings') || 
            location.pathname.includes('/dashboard/support');
        if (isExpired && !isAllowedExpired) {
            navigate('/plans');
        }
    }
  }, [user, authLoading, hasNoPlan, isExpired, location.pathname, navigate]);

  const isNearExpiration = daysLeft >= 0 && daysLeft <= 7;
  const isBasicPlan = !user?.plan_name || 
                      user?.plan_name.toLowerCase().includes('básico') || 
                      user?.plan_name.toLowerCase().includes('basico');

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
    { icon: ShoppingBag, label: 'Histórico de Vendas', path: '/dashboard/history' },
    { 
        icon: isBasicPlan ? Lock : PieChart, 
        label: 'Financeiro', 
        path: '/dashboard/financial',
        highlight: isBasicPlan 
    },
    { icon: Package, label: 'Estoque', path: '/dashboard/inventory' },
    { icon: Users, label: 'Clientes & Fiado', path: '/dashboard/customers' },
    { icon: Settings, label: 'Configurações', path: '/dashboard/settings' },
    { icon: LifeBuoy, label: 'Suporte', path: '/dashboard/support' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- RENDERIZAÇÃO DO STATUS DE SYNC E FALHAS ---
  const renderSyncStatus = () => {
    // 1. PRIORIDADE MÁXIMA: Vendas com Falha Crítica
    if (failedSalesCount > 0) {
        return (
            <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-pulse">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                    <XCircle size={16} />
                    <span>{failedSalesCount} Vendas Falharam</span>
                </div>
                <p className="text-[10px] text-red-600 leading-tight">
                    Ocorreu um erro persistente ao enviar essas vendas.
                </p>
                <Button 
                    size="sm" 
                    variant="danger" 
                    onClick={reportFailedSales}
                    isLoading={reporting}
                    className="w-full text-xs font-bold h-8 shadow-sm"
                >
                    Notificar Suporte
                </Button>
            </div>
        );
    }

    // 2. Sincronizando
    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-blue-50 text-blue-700 border-blue-100 animate-pulse cursor-wait">
                <RefreshCw size={14} className="animate-spin" />
                <span className="flex-1">Sincronizando...</span>
            </div>
        );
    }

    // 3. Offline
    if (!isOnline) {
        return (
            <div className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors",
                pendingSalesCount > 0 
                    ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" 
                    : "bg-gray-100 text-gray-500 border-gray-200" 
            )}>
                {pendingSalesCount > 0 ? <CloudOff size={14} /> : <WifiOff size={14} />}
                <span className="flex-1">
                    {pendingSalesCount > 0 
                        ? `Offline (${pendingSalesCount} pendentes)` 
                        : 'Modo Offline'}
                </span>
            </div>
        );
    }

    // 4. Pendentes (Online mas ainda não enviou)
    if (pendingSalesCount > 0) {
        return (
            <button 
                onClick={() => syncSales()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 transition-colors w-full text-left shadow-sm"
            >
                <AlertCircle size={14} className="animate-bounce" />
                <span className="flex-1">Sincronizar {pendingSalesCount} Vendas</span>
            </button>
        );
    }

    // 5. Tudo OK
    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-green-50 text-green-700 border-green-100">
            <CheckCircle size={14} />
            <span className="flex-1">Sistema Online</span>
        </div>
    );
  };

  const renderPlanBanner = () => {
      if (hasNoPlan) {
          return (
             <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-50">
                 <div className="flex items-center gap-3">
                     <div className="bg-brand-yellow text-brand-dark p-1.5 rounded-lg animate-pulse">
                        <AlertTriangle size={18} />
                     </div>
                     <div>
                        <p className="font-bold text-sm">Bem-vindo! Selecione um plano para começar.</p>
                     </div>
                 </div>
                 <Link to="/plans">
                    <Button size="sm" className="bg-brand-yellow text-brand-dark hover:bg-yellow-400 border-none font-bold">
                        Ver Planos
                    </Button>
                 </Link>
             </div>
          );
      }
      if (isExpired) {
          return (
              <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-50 animate-pulse">
                 <div className="flex items-center gap-3">
                     <AlertTriangle className="animate-bounce" />
                     <div>
                        <p className="font-bold text-sm">⛔ Plano Expirado. Renove agora para continuar usando.</p>
                     </div>
                 </div>
                 <Link to="/plans">
                    <Button size="sm" className="bg-white text-red-600 hover:bg-red-50 border-none font-bold">
                        Renovar
                    </Button>
                 </Link>
             </div>
          );
      }
      if (isNearExpiration) {
          return (
              <div className="bg-yellow-400 text-yellow-900 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-50">
                 <div className="flex items-center gap-3">
                     <AlertTriangle />
                     <div>
                        <p className="font-bold text-sm">
                            ⚠️ Atenção: Seu plano vence em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}.
                        </p>
                     </div>
                 </div>
                 <Link to="/plans">
                    <Button size="sm" variant="secondary" className="bg-white/50 hover:bg-white border-none font-bold text-yellow-900">
                        Renovar
                    </Button>
                 </Link>
             </div>
          );
      }
      return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      <WelcomeModal />
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center font-bold text-gray-900 shadow-sm">
              M
            </div>
            <span className="font-bold text-lg tracking-tight">Marketfy</span>
          </div>
          <nav className="px-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                    ? "bg-brand-yellow text-brand-dark shadow-sm font-bold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                   item.highlight && "opacity-80 hover:opacity-100" 
                )}
              >
                <item.icon size={18} className={clsx(
                    location.pathname === item.path && "text-brand-dark",
                    item.highlight && "text-gray-400"
                )} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative overflow-hidden">
             {!hasNoPlan && daysLeft < 30 && daysLeft > 0 && (
                 <div 
                    className={`absolute bottom-0 left-0 h-1 transition-all ${isNearExpiration ? 'bg-yellow-400' : 'bg-green-400'}`} 
                    style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }} 
                 />
             )}
             <div className="flex items-center gap-2 mb-1">
                <Crown size={14} className="text-brand-dark" />
                <span className="text-xs font-bold uppercase text-gray-600 truncate">{user?.plan_name || 'Sem Plano'}</span>
             </div>
             <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                 <Calendar size={10} />
                 {hasNoPlan ? (
                     <span className="text-red-400 font-bold">Contrate Agora</span>
                 ) : user?.plan_expiration ? (
                     isExpired ? <span className="text-red-500 font-bold">Expirado</span> : `Vence em ${daysLeft} dias`
                 ) : (
                    <span>Vitalício</span>
                 )}
             </div>
          </div>

          {renderSyncStatus()}

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative flex flex-col">
        {renderPlanBanner()}
        <div className="flex-1 relative">
            {(isExpired || hasNoPlan) && location.pathname !== '/dashboard/settings' && location.pathname !== '/dashboard/support' ? (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-red-50 p-6 rounded-full mb-4 shadow-sm">
                        <Lock size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-3">
                        {hasNoPlan ? "Ative sua Conta" : "Acesso Bloqueado"}
                    </h2>
                    <p className="text-gray-500 max-w-md mb-8 text-lg">
                        {hasNoPlan 
                            ? "Para começar a usar o Marketfy, escolha um plano que se adapte ao seu negócio." 
                            : "Sua assinatura expirou. Para acessar seus dados e continuar vendendo, renove seu plano agora."}
                    </p>
                    <Link to="/plans">
                        <Button size="xl" className="shadow-xl bg-brand-yellow hover:bg-yellow-400 text-brand-dark border-none font-bold px-10">
                            {hasNoPlan ? "Ver Planos Disponíveis" : "Regularizar Assinatura"}
                        </Button>
                    </Link>
                </div>
            ) : (
                <Outlet />
            )}
        </div>
      </main>
    </div>
  );
}
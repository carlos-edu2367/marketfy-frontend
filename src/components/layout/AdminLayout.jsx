import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../hooks/useSync';
import { 
  LogOut, Wifi, WifiOff, LayoutDashboard, Package, Users, 
  Settings, LifeBuoy, ShoppingBag, PieChart, RefreshCw, CloudOff, 
  CheckCircle, AlertTriangle, Crown, Calendar, Lock
} from 'lucide-react';
import clsx from 'clsx';
import { differenceInDays, parseISO } from 'date-fns';
import WelcomeModal from '../onboarding/WelcomeModal';
import { Button } from '../ui/Button'; // Certifique-se que o caminho está correto

export default function AdminLayout() {
  const { user, logout, refreshUser } = useAuth();
  const { isOnline, pendingSalesCount, isSyncing, syncSales } = useSync();
  const navigate = useNavigate();
  const location = useLocation();

  // Força atualização dos dados do usuário (Plano) ao montar o layout
  useEffect(() => {
    if (isOnline) {
        refreshUser();
    }
  }, [isOnline, refreshUser]);

  // --- CÁLCULO DE DIAS RESTANTES ---
  const getDaysLeft = () => {
      if (!user?.plan_expiration) return 999; // Sem data = vitalício ou erro
      try {
          return differenceInDays(parseISO(user.plan_expiration), new Date());
      } catch (e) {
          return 0;
      }
  };

  const daysLeft = getDaysLeft();
  const isExpired = daysLeft < 0 || user?.is_active === false;
  const isNearExpiration = daysLeft >= 0 && daysLeft <= 7;
  
  // Verifica se é plano básico para mostrar cadeado no menu
  const isBasicPlan = !user?.plan_name || 
                      user?.plan_name.toLowerCase().includes('básico') || 
                      user?.plan_name.toLowerCase().includes('basico');

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
    { icon: ShoppingBag, label: 'Histórico de Vendas', path: '/dashboard/history' },
    { 
        icon: isBasicPlan ? Lock : PieChart, // Mostra cadeado se for básico
        label: 'Financeiro', 
        path: '/dashboard/financial',
        highlight: isBasicPlan // Flag visual para estilização
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

  // --- RENDERIZAÇÃO DO STATUS DE SYNC ---
  const renderSyncStatus = () => {
    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-blue-50 text-blue-700 border-blue-100 animate-pulse cursor-wait">
                <RefreshCw size={14} className="animate-spin" />
                <span className="flex-1">Sincronizando...</span>
            </div>
        );
    }

    if (!isOnline) {
        return (
            <div className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors",
                pendingSalesCount > 0 
                    ? "bg-red-50 text-red-700 border-red-100" 
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

    if (pendingSalesCount > 0) {
        return (
            <button 
                onClick={() => syncSales()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-100 hover:bg-yellow-100 transition-colors w-full text-left"
            >
                <RefreshCw size={14} />
                <span className="flex-1">Enviar {pendingSalesCount} pendentes</span>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-green-50 text-green-700 border-green-100">
            <CheckCircle size={14} />
            <span className="flex-1">Sistema Online</span>
        </div>
    );
  };

  // --- RENDERIZAÇÃO DO BANNER DE PLANO ---
  const renderPlanBanner = () => {
      // 1. Expirado ou Inativo
      if (isExpired) {
          return (
              <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-50 animate-pulse">
                 <div className="flex items-center gap-3">
                     <AlertTriangle className="animate-bounce" />
                     <div>
                        <p className="font-bold text-sm">⛔ Plano Expirado. Renove agora para continuar usando.</p>
                     </div>
                 </div>
                 <Link to="/dashboard/settings">
                    <Button size="sm" className="bg-white text-red-600 hover:bg-red-50 border-none font-bold">
                        Renovar
                    </Button>
                 </Link>
             </div>
          );
      }

      // 2. Perto do vencimento (<= 7 dias)
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
                 <Link to="/dashboard/settings">
                    <Button size="sm" variant="secondary" className="bg-white/50 hover:bg-white border-none font-bold text-yellow-900">
                        Renovar
                    </Button>
                 </Link>
             </div>
          );
      }

      // 3. Plano Ativo (Opcional: Pode ser removido se quiser limpar a UI)
      /* return (
         <div className="bg-green-600 text-white px-2 py-1 text-[10px] font-bold text-center">
            ✅ Plano {user?.plan_name} Ativo
         </div>
      ); 
      */
      return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Modal de Boas Vindas */}
      <WelcomeModal />

      {/* Sidebar */}
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
                   item.highlight && "opacity-80 hover:opacity-100" // Estilo levemente diferente para itens bloqueados
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
          
          {/* Box de Plano na Sidebar */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative overflow-hidden">
             {/* Barra de Progresso Visual do Plano */}
             {daysLeft < 30 && daysLeft > 0 && (
                 <div 
                    className={`absolute bottom-0 left-0 h-1 transition-all ${isNearExpiration ? 'bg-yellow-400' : 'bg-green-400'}`} 
                    style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }} 
                 />
             )}
             
             <div className="flex items-center gap-2 mb-1">
                <Crown size={14} className="text-brand-dark" />
                <span className="text-xs font-bold uppercase text-gray-600 truncate">{user?.plan_name || 'Plano Básico'}</span>
             </div>
             
             <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                 <Calendar size={10} />
                 {user?.plan_expiration ? (
                     isExpired ? <span className="text-red-500 font-bold">Expirado</span> : `Vence em ${daysLeft} dias`
                 ) : (
                    <span>Vitalício</span>
                 )}
             </div>
          </div>

          {/* Status de Conectividade e Sync */}
          {renderSyncStatus()}

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative flex flex-col">
        {/* BANNER DE EXPIRAÇÃO NO TOPO */}
        {renderPlanBanner()}

        <div className="flex-1 relative">
            {/* Se estiver expirado, bloqueia tudo com um overlay, exceto settings e support */}
            {isExpired && location.pathname !== '/dashboard/settings' && location.pathname !== '/dashboard/support' ? (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-red-50 p-6 rounded-full mb-4">
                        <Lock size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Acesso Bloqueado</h2>
                    <p className="text-gray-500 max-w-md mb-6">Sua assinatura expirou. Para acessar seus dados e continuar vendendo, renove seu plano agora.</p>
                    <Link to="/dashboard/settings">
                        <Button size="xl" className="shadow-xl bg-red-600 hover:bg-red-700 text-white border-none font-bold">
                            Regularizar Assinatura
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
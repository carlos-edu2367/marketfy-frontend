import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  LogOut, 
  ShieldAlert 
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Layout principal para a área de administração do SaaS (SGM Master).
 * Localização: src/components/layout/SaaSLayout.jsx
 */
export default function SaaSLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/admin' },
    { icon: Package, label: 'Gestão de Planos', path: '/admin/plans' },
    { icon: MessageSquare, label: 'Chamados / Suporte', path: '/admin/tickets' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-gray-800 overflow-hidden">
      {/* Sidebar - Tema Escuro Profissional para Administrador Master */}
      <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 hidden md:flex flex-col justify-between shrink-0 transition-all duration-300">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-red-900/20">
              <ShieldAlert size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none">SGM Master</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Super Admin</span>
            </div>
          </div>

          <nav className="p-4 space-y-2 mt-4">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-900/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon size={18} className={clsx(isActive ? "text-white" : "text-slate-500 group-hover:text-white transition-colors")} />
                  {item.label}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/50 space-y-4 bg-slate-900">
          <div className="px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
             <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Utilizador</p>
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">
                    {user?.name?.charAt(0) || 'A'}
                </div>
                <p className="text-sm font-bold text-white truncate flex-1" title={user?.email}>
                    {user?.name || 'Administrador'}
                </p>
             </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-white hover:bg-red-600/90 rounded-xl transition-all duration-200 group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto bg-slate-50 relative scroll-smooth">
        <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-full">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
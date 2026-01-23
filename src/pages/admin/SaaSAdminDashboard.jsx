import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  TrendingUp, Users, Store, AlertCircle, Search, 
  Shield, Lock, Unlock, Key, RefreshCw, Loader2, CreditCard, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SaaSAdminDashboard() {
  const [loading, setLoading] = useState(true);
  
  // Dados do Dashboard
  const [metrics, setMetrics] = useState(null);
  const [expiringUsers, setExpiringUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]); // Lista de planos para o select
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [passwordModal, setPasswordModal] = useState({ open: false, userId: null, userName: null });
  const [planModal, setPlanModal] = useState({ open: false, userId: null, userName: null });

  // Carregamento Inicial
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Busca dados em paralelo (Dashboard + Usuários + Planos Disponíveis)
      const [dashboardRes, usersRes, plansRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/plans') // Busca planos para popular o select
      ]);

      setMetrics(dashboardRes.data.metrics);
      setExpiringUsers(dashboardRes.data.expiring_users);
      setUsers(usersRes.data);
      setPlans(plansRes.data);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // --- AÇÕES: STATUS ---
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      // Otimistic Update
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !currentStatus } : u));
      
      const { data } = await api.post(`/admin/users/${userId}/toggle-status`);
      toast.success(currentStatus ? 'Usuário bloqueado.' : 'Usuário desbloqueado.');
      
      // Sync final
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: data.is_active } : u));
    } catch (error) {
      toast.error("Erro ao alterar status.");
      loadDashboardData(); // Reverte em erro
    }
  };

  // --- AÇÕES: RESET DE SENHA ---
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const password = formData.get('password');

    if (!password || password.length < 6) return toast.error("Mínimo 6 caracteres.");

    try {
        await api.post(`/admin/users/${passwordModal.userId}/reset-password`, { password });
        toast.success(`Senha de ${passwordModal.userName} redefinida!`);
        setPasswordModal({ open: false, userId: null, userName: null });
    } catch (error) {
        toast.error("Erro ao resetar senha.");
    }
  };

  // --- AÇÕES: ATRIBUIR PLANO ---
  const handleAssignPlanSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const planId = formData.get('plan_id');
    const duration = parseInt(formData.get('duration_days'));

    if (!planId) return toast.error("Selecione um plano.");

    try {
        await api.post(`/admin/identity/plans/${planId}/subscribe`, {
            user_id_override: planModal.userId,
            duration_days: duration
        });

        toast.success(`Plano atribuído com sucesso para ${planModal.userName}!`);
        setPlanModal({ open: false, userId: null, userName: null });
        loadDashboardData(); // Recarrega para atualizar a data de expiração na tabela
    } catch (error) {
        console.error(error);
        toast.error("Erro ao atribuir plano.");
    }
  };

  // Filtragem
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-slate-400" size={40} />
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-900">Visão Geral</h1>
            <p className="text-slate-500">Gestão financeira e controle de assinantes.</p>
        </div>
        <Button variant="secondary" onClick={loadDashboardData} size="sm" className="bg-white hover:bg-slate-50">
            <RefreshCw size={16} /> Atualizar Dados
        </Button>
      </div>

      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
            title="MRR (Receita)" 
            value={formatCurrency(metrics?.mrr || 0)} 
            icon={TrendingUp} 
            color="bg-emerald-50 text-emerald-600"
            sub="Recorrência Mensal"
        />
        <MetricCard 
            title="Usuários Ativos" 
            value={metrics?.active_users || 0} 
            icon={Users} 
            color="bg-blue-50 text-blue-600"
            sub={`De ${metrics?.total_users} totais`}
        />
        <MetricCard 
            title="Total de Lojas" 
            value={metrics?.total_markets || 0} 
            icon={Store} 
            color="bg-purple-50 text-purple-600"
            sub="Mercados criados"
        />
        <MetricCard 
            title="Tickets Abertos" 
            value={metrics?.open_tickets || 0} 
            icon={AlertCircle} 
            color="bg-orange-50 text-orange-600"
            sub="Suporte pendente"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. TABELA DE USUÁRIOS (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Users size={18} className="text-slate-400" /> Base de Clientes
                </h3>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all focus:ring-2 focus:ring-slate-100"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Plano Atual</th>
                            <th className="px-6 py-3 text-center">Lojas</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Gerenciar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.user_id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-tight">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider mb-1",
                                                user.plan_name.toLowerCase().includes('pro') ? "bg-amber-100 text-amber-700" :
                                                user.plan_name.toLowerCase().includes('business') ? "bg-purple-100 text-purple-700" :
                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {user.plan_name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar size={10} />
                                                {user.plan_expiration ? formatDate(user.plan_expiration).split(' ')[0] : 'Vitalício'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-700">
                                        {user.markets_count}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            <button 
                                                onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                                                className={clsx(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                    user.is_active 
                                                        ? "text-green-600 bg-green-50 hover:bg-red-100 hover:text-red-600" 
                                                        : "text-red-600 bg-red-50 hover:bg-green-100 hover:text-green-600"
                                                )}
                                                title={user.is_active ? "Clique para Bloquear" : "Clique para Desbloquear"}
                                            >
                                                {user.is_active ? <Unlock size={16} /> : <Lock size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setPlanModal({ open: true, userId: user.user_id, userName: user.name })}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all shadow-sm"
                                                title="Renovar ou Alterar Plano"
                                            >
                                                <CreditCard size={14} /> Renovar
                                            </button>
                                            
                                            <button 
                                                onClick={() => setPasswordModal({ open: true, userId: user.user_id, userName: user.name })}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Resetar Senha"
                                            >
                                                <Key size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={24} className="opacity-20" />
                                        <p>Nenhum usuário encontrado.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 text-center font-medium">
                Mostrando {filteredUsers.length} de {users.length} usuários
            </div>
        </div>

        {/* 3. WIDGETS LATERAIS (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* Widget de Retenção */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-500" /> Próximos Vencimentos
                </h3>
                
                {expiringUsers.length > 0 ? (
                    <div className="space-y-3">
                        {expiringUsers.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                        {item.user_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-xs truncate max-w-[100px]">{item.user_name}</p>
                                        <p className="text-[10px] text-slate-500">{item.plan_name}</p>
                                    </div>
                                </div>
                                <div className={clsx(
                                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                    item.days_left <= 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                                )}>
                                    {item.days_left <= 0 ? "Venceu" : `${item.days_left} dias`}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs">Nenhum plano vencendo esta semana.</p>
                    </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <Button variant="ghost" className="w-full text-xs text-slate-500 h-8" size="sm">
                        Ver relatório completo
                    </Button>
                </div>
            </div>

            {/* Banner Status */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield size={100} />
                </div>
                <h4 className="font-bold text-lg mb-1 relative z-10">SGM Master</h4>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold mb-4 relative z-10">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                    API Operacional
                </div>
                <div className="text-slate-400 text-[10px] space-y-1 relative z-10">
                    <p>Ambiente: <span className="text-white">Produção</span></p>
                    <p>Database: <span className="text-white">Conectado</span></p>
                    <p>Versão: <span className="text-white">v1.3.0</span></p>
                </div>
            </div>
        </div>
      </div>

      {/* --- MODAL RESET SENHA --- */}
      {passwordModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-in border border-slate-100">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600 mx-auto">
                    <Key size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Redefinir Senha</h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                    Nova senha temporária para <strong>{passwordModal.userName}</strong>.
                </p>
                
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <Input 
                        name="password"
                        label="Nova Senha" 
                        type="text" 
                        placeholder="Ex: MudaSenha123" 
                        autoFocus
                        className="text-center tracking-widest"
                    />
                    
                    <div className="flex gap-3 pt-2">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            className="flex-1"
                            onClick={() => setPasswordModal({ open: false, userId: null, userName: null })}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            Salvar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL ATRIBUIR PLANO (NOVO) --- */}
      {planModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-in border border-slate-100">
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-purple-600 mx-auto">
                    <CreditCard size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Atribuir Plano</h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                    Selecione o plano e duração para <strong>{planModal.userName}</strong>.
                </p>
                
                <form onSubmit={handleAssignPlanSubmit} className="space-y-4">
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Plano</label>
                        <select 
                            name="plan_id" 
                            required
                            className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                        >
                            <option value="">Selecione...</option>
                            {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name} - R$ {p.price_monthly}/mês</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Duração / Ciclo</label>
                        <select 
                            name="duration_days" 
                            required
                            className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            defaultValue="30"
                        >
                            <option value="30">30 Dias (Mensal)</option>
                            <option value="180">180 Dias (Semestral)</option>
                            <option value="365">365 Dias (Anual)</option>
                        </select>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            className="flex-1"
                            onClick={() => setPlanModal({ open: false, userId: null, userName: null })}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                            Confirmar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

// Card de Métrica
const MetricCard = ({ title, value, icon: Icon, color, sub }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon size={22} />
            </div>
            {/* Opcional: Sparkline ou Badge de % aqui */}
        </div>
        <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
            {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
        </div>
    </div>
);
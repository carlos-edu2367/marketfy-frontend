import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User, FileText, Settings as Store, LogOut, Crown, Calendar, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import FiscalSettings from '../../components/settings/FiscalSettings';
import api from '../../lib/api';
import { differenceInDays, parseISO } from 'date-fns';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Estado das Abas
  const [activeTab, setActiveTab] = useState('profile');

  // Estado para Seleção de Loja (Aba Fiscal)
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // Carrega as lojas ao montar o componente
  useEffect(() => {
    async function loadMarkets() {
      try {
        setLoadingMarkets(true);
        const { data } = await api.get('/identity/markets');
        setMarkets(data);
        if (data.length > 0) {
          setSelectedMarketId(data[0].id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingMarkets(false);
      }
    }
    loadMarkets();
  }, []);

  // --- CÁLCULO DE VENCIMENTO DO PLANO ---
  const getPlanStatus = () => {
    if (!user?.plan_expiration) return { type: 'lifetime', label: 'Vitalício', color: 'text-green-600' };
    
    try {
        const daysLeft = differenceInDays(parseISO(user.plan_expiration), new Date());
        
        if (daysLeft < 0) return { type: 'expired', label: 'Expirado', color: 'text-red-600' };
        if (daysLeft <= 7) return { type: 'warning', label: `Vence em ${daysLeft} dias`, color: 'text-yellow-600' };
        
        return { type: 'active', label: `Vence em ${daysLeft} dias`, color: 'text-blue-600' };
    } catch (e) {
        return { type: 'error', label: 'Erro na data', color: 'text-gray-400' };
    }
  };

  const planStatus = getPlanStatus();

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 md:p-10 overflow-hidden">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Configurações</h1>
      <p className="text-gray-500 mb-8">Gerencie seu perfil, lojas e dados fiscais.</p>

      <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
        
        {/* SIDEBAR DE CONFIGURAÇÃO */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${activeTab === 'profile' ? 'bg-white text-brand-dark shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <User size={20} /> Perfil & Plano
          </button>
          
          <button 
            onClick={() => setActiveTab('fiscal')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${activeTab === 'fiscal' ? 'bg-white text-brand-dark shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <FileText size={20} /> Fiscal (NFC-e)
          </button>

          <div className="mt-auto pt-4 border-t border-gray-200">
             <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all w-full text-left">
                <LogOut size={20} /> Sair da Conta
             </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          
          {/* --- ABA PERFIL --- */}
          {activeTab === 'profile' && (
            <div className="p-8 overflow-y-auto custom-scrollbar">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User className="text-brand-yellow" /> Dados do Usuário
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Input label="Nome Completo" defaultValue={user?.name} readOnly className="bg-gray-50" />
                    <Input label="Email de Acesso" defaultValue={user?.email} readOnly className="bg-gray-50" />
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Crown size={120} />
                    </div>
                    
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Plano Atual</h3>
                        
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-brand-yellow rounded-2xl flex items-center justify-center text-brand-dark shadow-md">
                                <Crown size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{user?.plan_name || 'Plano Básico'}</p>
                                <div className={`flex items-center gap-2 text-sm font-bold ${planStatus.color}`}>
                                    {planStatus.type === 'expired' || planStatus.type === 'warning' ? <AlertTriangle size={14} /> : <Calendar size={14} />}
                                    <span>{planStatus.label}</span>
                                    {user?.plan_expiration && (
                                        <span className="text-gray-400 font-medium ml-1">
                                            ({formatDate(user.plan_expiration).split(' ')[0]})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={() => navigate('/plans')} variant="primary" className="font-bold shadow-lg">
                                {planStatus.type === 'expired' ? 'Renovar Agora' : 'Fazer Upgrade / Renovar'}
                            </Button>
                            <Button variant="secondary">Ver Faturas</Button>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* --- ABA FISCAL --- */}
          {activeTab === 'fiscal' && (
            <div className="p-8 h-full flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 shrink-0">
                    <FileText className="text-brand-yellow" /> Configuração Fiscal (NFC-e)
                </h2>

                {loadingMarkets ? (
                    <p className="text-gray-500">Carregando lojas...</p>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Seletor de Loja (Apenas se tiver mais de uma) */}
                        {markets.length > 1 && (
                            <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100 flex items-center justify-between mb-6 rounded-xl">
                                <div className="flex items-center gap-2 text-yellow-800">
                                    <Store size={18} />
                                    <span className="text-sm font-bold">Configurando Loja:</span>
                                </div>
                                <select 
                                    className="border border-yellow-200 rounded-lg py-1.5 px-3 text-sm bg-white font-medium text-gray-700 focus:ring-2 focus:ring-yellow-400 outline-none"
                                    value={selectedMarketId}
                                    onChange={(e) => setSelectedMarketId(e.target.value)}
                                >
                                    {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        )}
                        
                        {/* Componente de Configuração Fiscal (Renderiza o form) */}
                        {selectedMarketId ? (
                            <FiscalSettings marketId={selectedMarketId} />
                        ) : (
                            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <Store size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Nenhuma loja selecionada.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
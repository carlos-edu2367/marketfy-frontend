import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { 
  Store, TrendingUp, AlertTriangle, Users, Wallet, 
  ArrowLeft, ShoppingCart, Loader2, CheckCircle 
} from 'lucide-react';

export default function MarketDashboard() {
  const { marketId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [marketName, setMarketName] = useState("Carregando...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        try {
            // 1. Info básica da loja
            const marketsRes = await api.get('/identity/markets');
            const current = marketsRes.data.find(m => m.id === marketId);
            if (current) setMarketName(current.name);

            // 2. Estatísticas do Dashboard
            const statsRes = await api.get(`/sales/${marketId}/dashboard`);
            setStats(statsRes.data);

        } catch (error) {
            console.error("Erro ao carregar dashboard", error);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [marketId]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-yellow" size={40}/></div>;

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2 -ml-2 text-gray-500">
                    <ArrowLeft size={16} /> Voltar para lista
                </Button>
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                    <Store className="text-brand-yellow" /> {marketName}
                </h1>
                <p className="text-gray-500">Visão geral e desempenho da loja.</p>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate('/inventory')}>
                    Gerir Estoque
                </Button>
                <Button variant="primary" onClick={() => navigate(`/pdv/${marketId}`)}>
                    <ShoppingCart size={18} /> Abrir Frente de Caixa
                </Button>
            </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-2 text-green-600 font-bold uppercase text-xs tracking-wider">
                    <TrendingUp size={16} /> Vendas Hoje
                </div>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(stats?.today_sales_total || 0)}</p>
                <p className="text-sm text-gray-400">{stats?.today_sales_count || 0} vendas realizadas</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-2 text-blue-600 font-bold uppercase text-xs tracking-wider">
                    <CheckCircle size={16} /> Caixas Abertos
                </div>
                <p className="text-3xl font-black text-gray-900">{stats?.open_boxes || 0}</p>
                <p className="text-sm text-gray-400">Em operação agora</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-2 text-yellow-600 font-bold uppercase text-xs tracking-wider">
                    <Wallet size={16} /> A Receber (Fiado)
                </div>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(stats?.total_receivables || 0)}</p>
                <Button variant="ghost" size="sm" className="mt-auto -ml-3 text-yellow-600 hover:bg-yellow-50" onClick={() => navigate('/customers')}>
                    Gerenciar Clientes →
                </Button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-2 text-red-500 font-bold uppercase text-xs tracking-wider">
                    <AlertTriangle size={16} /> Alertas
                </div>
                <p className="text-3xl font-black text-gray-900">OK</p>
                <p className="text-sm text-gray-400">Sistema operando normalmente</p>
            </div>
        </div>

        {/* Áreas Futuras (Placeholder visual) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 h-64 flex flex-col items-center justify-center text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <TrendingUp size={32} className="text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900">Gráfico de Vendas Semanal</h3>
                <p className="text-sm text-gray-500">Disponível em breve no plano Premium.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 h-64 flex flex-col items-center justify-center text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Users size={32} className="text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900">Melhores Clientes</h3>
                <p className="text-sm text-gray-500">Ranking de compras disponível em breve.</p>
            </div>
        </div>
    </div>
  );
}
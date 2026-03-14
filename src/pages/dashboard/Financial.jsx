import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form'; // Adicionado
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input'; // Importado Input para o modal
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, DollarSign, 
  Calendar, ArrowUpRight, ArrowDownRight,
  Wallet, Loader2, Crown, Download, Store, Plus, X, CheckCircle // Novos ícones
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Financial() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [data, setData] = useState(null);
  
  // Filtros
  const [period, setPeriod] = useState('month'); // 'month', 'year'
  const [currentDate] = useState(new Date());

  // Modal de Transação
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm();

  // Watch para mostrar campo de data de pagamento condicionalmente
  const isPaid = watch('is_paid');

  // --- 1. VALIDAÇÃO DE PLANO (SEGURANÇA) ---
  const isBasicPlan = useMemo(() => {
      const plan = user?.plan_name?.toLowerCase() || '';
      return plan.includes('básico') || plan.includes('basico') || plan.includes('free');
  }, [user]);

  // --- 2. CARREGAR LOJAS ---
  useEffect(() => {
    if (isBasicPlan) return;

    async function loadMarkets() {
        try {
            const { data } = await api.get('/identity/markets');
            setMarkets(data);
            
            if (data.length > 0) {
                setSelectedMarketId(data[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Erro ao carregar lojas:", error);
            toast.error("Não foi possível carregar suas lojas.");
            setLoading(false);
        }
    }
    loadMarkets();
  }, [isBasicPlan]);

  // --- 3. CARREGAR DADOS FINANCEIROS ---
  const loadFinancialData = useCallback(async () => {
    if (!selectedMarketId) return;

    try {
      setLoading(true);
      const { data } = await api.get(`/analytics/${selectedMarketId}/financial`, {
          params: {
              period: period,
              date: currentDate.toISOString()
          }
      });
      setData(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }, [selectedMarketId, period, currentDate]);

  useEffect(() => {
    if (selectedMarketId) {
        loadFinancialData();
    }
  }, [loadFinancialData, selectedMarketId]);

  // --- 4. REGISTRAR NOVA MOVIMENTAÇÃO ---
  const handleTransactionSubmit = async (formData) => {
    if (!selectedMarketId) return;

    try {
        const payload = {
            description: formData.description,
            amount: parseFloat(formData.amount),
            type: formData.type, // 'receita' ou 'despesa'
            category: formData.category,
            due_date: new Date(formData.due_date).toISOString(),
            // Se marcado como pago, usa a data informada ou a data atual como fallback
            paid_at: formData.is_paid 
                ? (formData.paid_at ? new Date(formData.paid_at).toISOString() : new Date().toISOString()) 
                : null
        };

        await api.post(`/finance/${selectedMarketId}/transactions`, payload);
        
        toast.success("Lançamento registrado com sucesso!");
        setShowTransactionModal(false);
        reset();
        loadFinancialData(); // Atualiza o dashboard
    } catch (error) {
        console.error(error);
        toast.error("Erro ao registrar movimentação.");
    }
  };

  // --- RENDERIZAÇÃO: TELA DE BLOQUEIO (UPSELL) ---
  if (isBasicPlan) {
      return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden rounded-3xl bg-slate-50 border border-slate-200 m-4">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
                  <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                  <div className="absolute bottom-10 right-10 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
              </div>

              <div className="relative z-10 max-w-lg mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-brand-yellow to-orange-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-200 rotate-3 transform hover:rotate-6 transition-transform">
                    <Crown size={48} className="text-white" />
                </div>

                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                    Gestão Financeira Profissional
                </h1>
                <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                    O plano <strong>Básico</strong> não inclui o módulo financeiro avançado. 
                    Desbloqueie o DRE, controle de fluxo de caixa, gráficos de evolução e muito mais fazendo o upgrade para o <strong>Marketfy PRO</strong>.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/dashboard/settings">
                        <Button size="xl" className="w-full sm:w-auto font-black shadow-lg shadow-slate-200 bg-slate-900 text-white hover:bg-slate-800 border-none">
                            Quero Fazer Upgrade Agora
                        </Button>
                    </Link>
                    <Link to="/dashboard">
                        <Button variant="secondary" size="xl" className="w-full sm:w-auto font-bold bg-white/80 backdrop-blur-sm">
                            Voltar ao Início
                        </Button>
                    </Link>
                </div>
              </div>
          </div>
      );
  }

  // --- RENDERIZAÇÃO: ESTADO VAZIO / SEM LOJA ---
  if (!isBasicPlan && markets.length === 0 && !loading) {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400">
              <Store size={48} className="mb-4 opacity-20" />
              <h2 className="text-xl font-bold text-slate-600">Nenhuma loja encontrada</h2>
              <p className="mb-6">Cadastre uma loja no Dashboard para ver o financeiro.</p>
              <Link to="/dashboard">
                  <Button>Ir para Dashboard</Button>
              </Link>
          </div>
      );
  }

  // --- RENDERIZAÇÃO: CARREGANDO ---
  if (loading || !data) {
      return (
          <div className="flex h-[80vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-brand-yellow" size={48} />
                <p className="text-slate-400 font-medium animate-pulse">Consolidando dados financeiros...</p>
              </div>
          </div>
      );
  }

  // Dados Sanitizados (Safety Checks e Conversão de Tipos)
  const kpis = data.kpis || {};
  const evolution = data.evolution || [];
  const transactions = data.recent_transactions || [];
  
  const categories = (data.categories || []).map(cat => ({
      ...cat,
      value: Number(cat.value) 
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financeiro</h1>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-500 font-medium">Resultados da loja:</p>
                <select 
                    value={selectedMarketId}
                    onChange={(e) => setSelectedMarketId(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-yellow focus:border-brand-yellow block p-1.5 font-bold outline-none"
                >
                    {markets.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {/* BOTÃO NOVO LANÇAMENTO */}
            <Button 
                onClick={() => { reset(); setShowTransactionModal(true); }} 
                className="bg-brand-yellow hover:bg-yellow-400 text-slate-900 font-bold shadow-md"
            >
                <Plus size={18} /> Novo Lançamento
            </Button>

            <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <Button 
                    variant={period === 'month' ? 'primary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('month')}
                    className={period === 'month' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}
                >
                    Este Mês
                </Button>
                <Button 
                    variant={period === 'year' ? 'primary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setPeriod('year')}
                    className={period === 'year' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}
                >
                    Este Ano
                </Button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900" title="Alterar Data (Em breve)">
                    <Calendar size={18} />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900" title="Exportar Relatório">
                    <Download size={18} />
                </Button>
            </div>
        </div>
      </div>

      {/* 1. CARDS DE KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
            title="Receita Total" 
            value={kpis.revenue || 0} 
            trend={kpis.revenue_trend}
            icon={TrendingUp}
            color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard 
            title="Despesas" 
            value={kpis.expenses || 0} 
            trend={kpis.expenses_trend}
            trendInverse
            icon={TrendingDown}
            color="bg-rose-50 text-rose-600"
        />
        <KpiCard 
            title="Lucro Líquido" 
            value={kpis.profit || 0} 
            trend={kpis.profit_trend}
            icon={DollarSign}
            color="bg-blue-50 text-blue-600"
            isMain
        />
        <KpiCard 
            title="A Receber (Fiado)" 
            value={kpis.pending || 0} 
            icon={Wallet}
            color="bg-amber-50 text-amber-600"
            subtitle="Acumulado total"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. GRÁFICO DE EVOLUÇÃO (ÁREA) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Evolução Financeira</h3>
                    <p className="text-sm text-slate-400">Comparativo Receitas x Despesas</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Receitas
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500"></span> Despesas
                    </div>
                </div>
            </div>
            
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} tickFormatter={(value) => `R$${value >= 1000 ? (value/1000) + 'k' : value}`} />
                        <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => [formatCurrency(value), '']}
                            labelStyle={{ color: '#64748B', marginBottom: '0.5rem' }}
                        />
                        <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#F43F5E" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* 3. GRÁFICO DE CATEGORIAS (ROSCA) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Meios de Pagamento</h3>
            <p className="text-sm text-slate-400 mb-6">Distribuição das entradas</p>
            
            <div className="h-[300px] w-full relative">
                {categories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={categories}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                            >
                                {categories.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || '#CBD5E1'} strokeWidth={0} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </RePieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <DollarSign size={48} className="opacity-20 mb-2" />
                        <p className="text-xs">Sem dados de pagamento</p>
                    </div>
                )}
                
                {categories.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                        <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                        <span className="text-lg font-black text-slate-800">
                            {formatCurrency(categories.reduce((a, b) => a + Number(b.value), 0))}
                        </span>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 4. ÚLTIMAS TRANSAÇÕES */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-slate-800 text-lg">Últimas Movimentações</h3>
                <p className="text-sm text-slate-400">Entradas e saídas recentes do caixa</p>
            </div>
            <Button variant="ghost" className="text-brand-dark font-bold hover:bg-slate-50">
                Ver Extrato Completo
            </Button>
        </div>
        
        <div className="divide-y divide-slate-100">
            {transactions.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            t.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                            {t.type === 'in' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{t.desc}</p>
                            
                            <p className="text-xs text-slate-500">
                                {t.date
                                ? (() => {
                                    const date = new Date(t.date);
                                    date.setHours(date.getHours() - 3);

                                    return date.toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    })()
                                : 'Sem data'}
                                </p>
                        </div>
                    </div>
                    <span className={clsx(
                        "font-black text-lg",
                        t.type === 'in' ? "text-emerald-600" : "text-rose-600"
                    )}>
                        {t.type === 'in' ? '+' : '-'} {formatCurrency(t.value)}
                    </span>
                </div>
            ))}
            {transactions.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                    Nenhuma movimentação registrada neste período.
                </div>
            )}
        </div>
      </div>

      {/* --- MODAL NOVA MOVIMENTAÇÃO (NOVO) --- */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-scale-in border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="bg-brand-yellow p-1.5 rounded-lg text-slate-900">
                            <Plus size={18} strokeWidth={3} />
                        </div>
                        Novo Lançamento
                    </h3>
                    <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit(handleTransactionSubmit)} className="p-6 space-y-4">
                    
                    {/* Seleção de Tipo */}
                    <div className="grid grid-cols-2 gap-4">
                        <label className="cursor-pointer">
                            <input type="radio" value="receita" {...register('type', { required: true })} className="peer sr-only" />
                            <div className="border border-slate-200 rounded-xl p-3 text-center peer-checked:bg-emerald-50 peer-checked:border-emerald-500 peer-checked:text-emerald-700 hover:bg-slate-50 transition-all">
                                <TrendingUp className="mx-auto mb-1" size={20} />
                                <span className="text-sm font-bold">Receita</span>
                            </div>
                        </label>
                        <label className="cursor-pointer">
                            <input type="radio" value="despesa" {...register('type', { required: true })} className="peer sr-only" defaultChecked />
                            <div className="border border-slate-200 rounded-xl p-3 text-center peer-checked:bg-rose-50 peer-checked:border-rose-500 peer-checked:text-rose-700 hover:bg-slate-50 transition-all">
                                <TrendingDown className="mx-auto mb-1" size={20} />
                                <span className="text-sm font-bold">Despesa</span>
                            </div>
                        </label>
                    </div>

                    <Input 
                        label="Descrição" 
                        placeholder="Ex: Pagamento Internet, Aporte..." 
                        {...register('description', { required: 'Descrição obrigatória' })}
                        autoFocus
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Valor (R$)" 
                            type="number" 
                            step="0.01" 
                            placeholder="0,00" 
                            {...register('amount', { required: true })}
                        />
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
                            <select {...register('category', { required: true })} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 outline-none focus:ring-2 focus:ring-brand-yellow bg-white">
                                <option value="Operacional">Operacional</option>
                                <option value="Fornecedores">Fornecedores</option>
                                <option value="Pessoal">Pessoal</option>
                                <option value="Impostos">Impostos / Taxas</option>
                                <option value="Investimento">Investimento</option>
                                <option value="Vendas">Vendas (Extra)</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Vencimento / Data" 
                            type="date" 
                            defaultValue={new Date().toISOString().split('T')[0]}
                            {...register('due_date', { required: true })}
                        />
                        
                        {/* Checkbox Pago */}
                        <div className="flex flex-col justify-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" {...register('is_paid')} className="w-5 h-5 rounded text-brand-yellow focus:ring-brand-yellow border-gray-300" />
                                <span className="font-medium text-slate-700">Já está pago?</span>
                            </label>
                        </div>
                    </div>

                    {/* Data Pagamento (Condicional) */}
                    {isPaid && (
                        <div className="animate-fade-in bg-green-50 p-3 rounded-xl border border-green-100">
                             <Input 
                                label="Data do Pagamento" 
                                type="date" 
                                defaultValue={new Date().toISOString().split('T')[0]}
                                {...register('paid_at')}
                                className="bg-white"
                            />
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowTransactionModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 font-bold shadow-lg" isLoading={isSubmitting}>
                            <CheckCircle size={18} /> Confirmar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

// Componente de Card de KPI
const KpiCard = ({ title, value, trend, icon: Icon, color, isMain, trendInverse, subtitle }) => {
    const isPositive = trend > 0;
    const isGood = trendInverse ? !isPositive : isPositive; // Para despesas, subir é ruim (vermelho)

    return (
        <div className={clsx(
            "p-6 rounded-3xl border flex flex-col justify-between transition-all hover:shadow-md",
            isMain ? "bg-slate-900 text-white border-slate-800 shadow-xl" : "bg-white text-slate-900 border-slate-200 shadow-sm"
        )}>
            <div className="flex justify-between items-start mb-4">
                <div className={clsx(
                    "p-3 rounded-2xl",
                    isMain ? "bg-slate-800 text-brand-yellow" : color
                )}>
                    <Icon size={22} />
                </div>
                {trend !== undefined && trend !== null && (
                    <div className={clsx(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                        isGood ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                        isMain && (isGood ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")
                    )}>
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            
            <div>
                <p className={clsx(
                    "text-[10px] font-black uppercase tracking-widest mb-1",
                    isMain ? "text-slate-400" : "text-slate-400"
                )}>
                    {title}
                </p>
                <h3 className="text-3xl font-black tracking-tight">{formatCurrency(value || 0)}</h3>
                {subtitle && (
                    <p className={clsx("text-xs mt-1", isMain ? "text-slate-500" : "text-slate-400")}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};
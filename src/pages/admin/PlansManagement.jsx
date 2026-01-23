import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Edit2, LayoutDashboard, Loader2, Store, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';

export default function PlansManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/plans');
      setPlans(data);
    } catch (error) {
      toast.error('Erro ao carregar planos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenModal = (plan = null) => {
    setEditingPlan(plan);
    if (plan) {
        setValue('name', plan.name);
        setValue('type', plan.type);
        setValue('max_markets', plan.max_markets);
        setValue('max_terminals', plan.max_terminals);
        setValue('price_monthly', plan.price_monthly);
        setValue('price_180days', plan.price_180days); // CORREÇÃO: Preço Semestral
        setValue('price_annual', plan.price_annual);
        setValue('is_active', plan.is_active);
    } else {
        reset({ 
            type: 'pago', 
            is_active: true,
            max_markets: 1,
            max_terminals: 1,
            price_monthly: 0,
            price_180days: 0, // Default
            price_annual: 0
        });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
        const payload = {
            ...data,
            max_markets: parseInt(data.max_markets),
            max_terminals: parseInt(data.max_terminals),
            price_monthly: parseFloat(data.price_monthly),
            price_180days: parseFloat(data.price_180days || 0), // Envia semestral
            price_annual: parseFloat(data.price_annual),
            is_active: data.is_active === 'true' || data.is_active === true
        };

        if (editingPlan) {
            await api.put(`/admin/plans/${editingPlan.id}`, payload);
            toast.success("Plano atualizado!");
        } else {
            await api.post('/admin/plans', payload);
            toast.success("Plano criado!");
        }
        setIsModalOpen(false);
        fetchPlans();
    } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar plano.");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/admin')}>
                <ArrowLeft /> Voltar
            </Button>
            <div>
                <h1 className="text-3xl font-black text-slate-800">Planos de Assinatura</h1>
                <p className="text-slate-500">Defina os pacotes disponíveis para contratação.</p>
            </div>
            <div className="ml-auto">
                <Button onClick={() => handleOpenModal()} className="bg-slate-900 text-white hover:bg-slate-800">
                    <Plus size={20} /> Novo Plano
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
                <div className="col-span-3 text-center py-10"><Loader2 className="animate-spin inline text-slate-400" /></div>
            ) : plans.map(plan => (
                <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative group overflow-hidden">
                    {!plan.is_active && (
                        <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                            ARQUIVADO
                        </div>
                    )}
                    
                    <div className="mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                            {plan.type}
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 mt-2">{plan.name}</h3>
                        <p className="text-3xl font-light text-slate-600 mt-1">
                            {formatCurrency(plan.price_monthly)}<span className="text-sm text-slate-400">/mês</span>
                        </p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1">
                        <div className="flex items-center gap-2">
                            <Store size={16} className="text-slate-400" />
                            <strong>{plan.max_markets}</strong> Lojas
                        </div>
                        <div className="flex items-center gap-2">
                            <LayoutDashboard size={16} className="text-slate-400" />
                            <strong>{plan.max_terminals}</strong> Terminais/PDV
                        </div>
                    </div>

                    <Button variant="secondary" className="w-full border-slate-200 hover:border-slate-400" onClick={() => handleOpenModal(plan)}>
                        <Edit2 size={16} /> Editar
                    </Button>
                </div>
            ))}
        </div>

        {/* MODAL PORTAL */}
        {isModalOpen && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800">
                            {editingPlan ? `Editar ${editingPlan.name}` : 'Novo Plano'}
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <Input label="Nome do Plano" placeholder="Ex: Enterprise" {...register('name', { required: true })} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Tipo</label>
                                    <select {...register('type')} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white">
                                        <option value="pago">Pago</option>
                                        <option value="trial">Trial (Teste)</option>
                                        <option value="cortesia">Cortesia</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Status</label>
                                    <select {...register('is_active')} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white">
                                        <option value={true}>Ativo</option>
                                        <option value={false}>Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Max. Lojas" type="number" {...register('max_markets', { required: true })} />
                                <Input label="Max. Terminais" type="number" {...register('max_terminals', { required: true })} />
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 space-y-3">
                                <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Precificação</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <Input label="Mensal (R$)" type="number" step="0.01" {...register('price_monthly', { required: true })} />
                                    <Input label="Semestral (R$)" type="number" step="0.01" {...register('price_180days')} />
                                    <Input label="Anual (R$)" type="number" step="0.01" {...register('price_annual', { required: true })} />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" variant="primary" className="flex-1 font-bold bg-slate-900 text-white hover:bg-slate-800">Salvar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
}
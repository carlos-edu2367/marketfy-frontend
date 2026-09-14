import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Edit2, FileText, LayoutDashboard, Loader2, Store, X, ArrowLeft } from 'lucide-react';
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

  const fetchPlans = useCallback(async () => {    try {
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
        setValue('type', plan.type || 'pago');
        setValue('is_active', plan.is_active ?? true);
        setValue('max_markets', plan.max_markets);
        setValue('max_terminals', plan.max_terminals);
        setValue('price_monthly', plan.price_monthly);
        setValue('price_180days', plan.price_180days);
        setValue('price_annual', plan.price_annual);
        setValue('fiscal_monthly_limit', plan.fiscal_monthly_limit ?? 0);
        setValue('description', plan.description ?? '');
        setValue('display_order', plan.display_order ?? 0);
        setValue('is_recommended', Boolean(plan.is_recommended));
    } else {
        reset({ type: 'pago', is_active: true, fiscal_monthly_limit: 0, description: '', display_order: 0, is_recommended: false });
    }
    setIsModalOpen(true);
  };

  // CORREÇÃO: Tratamento de Tipos para PUT (Edição)
  const handleSavePlan = async (data) => {
    try {
        const payload = {
            name: data.name,
            type: data.type || 'pago',
            is_active: Boolean(data.is_active),
            max_markets: parseInt(data.max_markets), // Garante int
            max_terminals: parseInt(data.max_terminals), // Garante int
            price_monthly: parseFloat(data.price_monthly), // Garante float
            price_180days: parseFloat(data.price_180days || 0),
            price_annual: parseFloat(data.price_annual || 0),
            fiscal_monthly_limit: parseInt(data.fiscal_monthly_limit || 0, 10),
            description: data.description?.trim() || null,
            display_order: parseInt(data.display_order || 0, 10),
            is_recommended: Boolean(data.is_recommended),
        };

        if (editingPlan) {
            // PUT para edição conforme spec
            await api.put(`/admin/plans/${editingPlan.id}`, payload);
            toast.success('Plano atualizado!');
        } else {
            // POST para criação (se existir endpoint, assumindo que seja similar)
            await api.post('/admin/plans', payload);
            toast.success('Plano criado!');
        }
        
        setIsModalOpen(false);
        fetchPlans();
    } catch (error) {
        console.error("Erro ao salvar plano:", error);
        toast.error('Erro ao salvar plano. Verifique os dados.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin')}>
                    <ArrowLeft size={18} /> Voltar
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Gestão de Planos</h1>
                    <p className="text-gray-500">Configuração de preços e limites do SaaS.</p>
                </div>
            </div>
            <Button onClick={() => handleOpenModal()}>
                <Plus size={18} /> Novo Plano
            </Button>
        </div>

        {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand-dark" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative group hover:border-gray-300 transition-all">
                        <div className="absolute top-4 right-4 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(plan)} aria-label={`Editar ${plan.name}`} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-brand-dark">
                                <Edit2 size={18} />
                            </button>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                        <p className="text-3xl font-black text-brand-dark mb-4">{formatCurrency(plan.price_monthly)}<span className="text-sm text-gray-400 font-medium">/mês</span></p>
                        
                        <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2">
                                <Store size={16} className="text-brand-yellow" />
                                <span>Até <strong>{plan.max_markets}</strong> Lojas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <LayoutDashboard size={16} className="text-brand-yellow" />
                                <span>Até <strong>{plan.max_terminals}</strong> PDVs por loja</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-brand-yellow" />
                                <span><strong>{plan.fiscal_monthly_limit ?? 0}</strong> NFC-e por mês</span>
                            </div>
                            {plan.is_recommended && (
                                <span className="inline-block rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-black uppercase text-brand-dark">Recomendado</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && createPortal(
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                        <h2 className="text-xl font-bold">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
                    </div>
                    
                    <div className="p-6">
                        <form onSubmit={handleSubmit(handleSavePlan)} className="space-y-4">
                            <Input label="Nome do Plano" placeholder="Ex: Basic, Pro..." {...register('name', { required: true })} />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
                                    <select {...register('type', { required: true })} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none">
                                        <option value="pago">Pago</option>
                                        <option value="trial">Trial</option>
                                        <option value="cortesia">Cortesia</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 pt-7">
                                    <input type="checkbox" {...register('is_active')} />
                                    Plano ativo
                                </label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Max. Lojas" type="number" {...register('max_markets', { required: true })} />
                                <Input label="Max. Terminais" type="number" {...register('max_terminals', { required: true })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="plan-fiscal-limit" className="text-sm font-medium text-gray-700">Emissões NFC-e por mês</label>
                                    <input id="plan-fiscal-limit" type="number" min="0" className="w-full border border-gray-300 rounded-lg p-2.5" {...register('fiscal_monthly_limit', { required: true, min: 0 })} />
                                    <span className="text-xs text-gray-400">0 = emissão não incluída no plano.</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="plan-display-order" className="text-sm font-medium text-gray-700">Ordem de exibição</label>
                                    <input id="plan-display-order" type="number" className="w-full border border-gray-300 rounded-lg p-2.5" {...register('display_order')} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="plan-description" className="text-sm font-medium text-gray-700">Descrição curta (aparece no card)</label>
                                <textarea id="plan-description" rows={2} maxLength={280} className="w-full border border-gray-300 rounded-lg p-2.5" {...register('description')} />
                            </div>
                            <label htmlFor="plan-recommended" className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <input id="plan-recommended" type="checkbox" {...register('is_recommended')} />
                                Plano recomendado (destacado na landing e em /plans; desmarca os outros)
                            </label>

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

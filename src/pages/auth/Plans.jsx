import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Check, ArrowRight, X, ShieldCheck, Gift, Loader2, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingTrial, setActivatingTrial] = useState(false);
  
  const [selectedDuration, setSelectedDuration] = useState(30); 
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data } = await api.get('/identity/plans');
        // Filtra apenas ativos E remove planos cortesia/trial da vitrine pública de compra normal
        // O Trial será exibido em um card dedicado fixo
        const publicPlans = data.filter(p => p.is_active && p.type !== 'cortesia' && p.type !== 'trial');
        
        // Ordena por preço
        publicPlans.sort((a, b) => a.price_monthly - b.price_monthly);
        
        setPlans(publicPlans);
      } catch (error) {
        console.error("Erro ao carregar planos", error);
        toast.error("Erro ao carregar opções de planos.");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const onSubmitInterest = async (data) => {
    try {
        await api.post('/identity/plans/interest', {
            plan_id: selectedPlan.id,
            duration: selectedDuration,
            whatsapp1: data.whatsapp1,
            whatsapp2: data.whatsapp2
        });
        toast.success("Recebemos seu interesse! Entraremos em contato.");
        setShowModal(false);
        reset();
    } catch (error) {
        toast.error("Erro ao enviar interesse.");
    }
  };

  const handleActivateTrial = async () => {
    try {
        setActivatingTrial(true);
        await api.post('/auth/trial', {});
        await refreshUser();
        toast.success("Período de testes ativado com sucesso!");
        navigate('/dashboard');
    } catch (error) {
        const msg = error.response?.data?.detail || "Erro ao ativar trial.";
        toast.error(msg);
    } finally {
        setActivatingTrial(false);
    }
  };

  const getPrice = (plan) => {
      if (selectedDuration === 30) return plan.price_monthly;
      if (selectedDuration === 180) return plan.price_180days;
      if (selectedDuration === 365) return plan.price_annual;
      return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* HEADER SIMPLES */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="font-black text-xl tracking-tight flex items-center gap-2">
                  <div className="bg-brand-yellow w-8 h-8 rounded-lg flex items-center justify-center text-brand-dark">M</div>
                  Marketfy
              </div>
              <div className="text-sm text-gray-500">
                  Logado como <span className="font-bold text-gray-900">{user?.name}</span>
              </div>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-4xl font-black text-gray-900 mb-4">Escolha o plano ideal</h1>
            <p className="text-gray-500 text-lg">
                Desbloqueie todo o potencial do seu mercado. Sem fidelidade, cancele quando quiser.
            </p>
            
            {/* SELETOR DE PERÍODO */}
            <div className="flex justify-center mt-8 gap-4">
                {[
                    { label: 'Mensal', value: 30 },
                    { label: 'Semestral (-5%)', value: 180 },
                    { label: 'Anual (-10%)', value: 365 }
                ].map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setSelectedDuration(opt.value)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            selectedDuration === opt.value 
                            ? 'bg-slate-900 text-white shadow-lg scale-105' 
                            : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>

        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-brand-yellow" size={48} />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                
                {/* CARD TRIAL - SEMPRE VISÍVEL SE ELEGÍVEL */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-3xl border-2 border-brand-yellow/50 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div className="absolute top-0 right-0 bg-brand-yellow text-brand-dark text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl">
                        Recomendado
                    </div>
                    
                    <div className="w-12 h-12 bg-brand-yellow rounded-2xl flex items-center justify-center text-brand-dark mb-4 shadow-sm">
                        <Gift size={24} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Teste Grátis</h3>
                    <p className="text-sm text-gray-600 mb-6 min-h-[40px]">
                        Experimente o plano PRO completo por 14 dias sem compromisso.
                    </p>
                    
                    <div className="mb-6">
                        <span className="text-4xl font-black text-gray-900">R$ 0</span>
                        <span className="text-gray-500 font-medium">/14 dias</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                        <li className="flex gap-2 text-sm text-gray-700 font-medium"><Check size={18} className="text-green-600 shrink-0"/> Todas as funções PRO</li>
                        <li className="flex gap-2 text-sm text-gray-700 font-medium"><Check size={18} className="text-green-600 shrink-0"/> Emissão Fiscal</li>
                        <li className="flex gap-2 text-sm text-gray-700 font-medium"><Check size={18} className="text-green-600 shrink-0"/> Suporte Completo</li>
                    </ul>

                    <Button 
                        onClick={handleActivateTrial} 
                        isLoading={activatingTrial}
                        className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold h-12 shadow-lg"
                    >
                        Ativar Agora
                    </Button>
                    <p className="text-xs text-center text-gray-400 mt-3">Não pede cartão de crédito.</p>
                </div>

                {/* PLANOS NORMAIS */}
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all hover:border-brand-yellow/30 hover:-translate-y-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <p className="text-xs text-gray-500 mb-6 min-h-[32px]">
                            {plan.description || "Para negócios em crescimento."}
                        </p>
                        
                        <div className="mb-6">
                            <span className="text-4xl font-black text-gray-900">{formatCurrency(getPrice(plan))}</span>
                            <span className="text-gray-400 font-medium text-xs block mt-1">
                                {selectedDuration === 30 ? '/mês' : (selectedDuration === 180 ? '/semestre' : '/ano')}
                            </span>
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex gap-2 text-sm text-gray-600">
                                <Store size={18} className="text-brand-yellow shrink-0" /> 
                                <span>Até <strong>{plan.max_markets}</strong> lojas</span>
                            </div>
                            <div className="flex gap-2 text-sm text-gray-600">
                                <ShieldCheck size={18} className="text-brand-yellow shrink-0" />
                                <span>Até <strong>{plan.max_terminals}</strong> caixas</span>
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleSelectPlan(plan)}
                            variant="secondary"
                            className="w-full border-2 border-gray-100 hover:border-brand-yellow hover:bg-yellow-50 text-gray-700 font-bold h-12"
                        >
                            Contratar
                        </Button>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* MODAL DE INTERESSE */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X />
                </button>

                <h2 className="text-2xl font-black text-gray-900 mb-2">Finalizar Contratação</h2>
                <p className="text-gray-500 mb-6">Nossa equipe ativará seu plano em instantes.</p>

                <form onSubmit={handleSubmit(onSubmitInterest)} className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                        <p className="font-bold mb-1">Resumo do Pedido</p>
                        <p>Plano: <strong>{selectedPlan.name}</strong></p>
                        <p>Valor: <strong>{formatCurrency(getPrice(selectedPlan))}</strong> ({selectedDuration === 30 ? 'Mensal' : (selectedDuration === 180 ? 'Semestral' : 'Anual')})</p>
                    </div>

                    <Input label="Seu WhatsApp" placeholder="(00) 00000-0000" {...register('whatsapp1', { required: true })} autoFocus />
                    
                    <div className="pt-4">
                        <Button type="submit" variant="primary" size="lg" className="w-full font-bold" isLoading={isSubmitting}>
                            Solicitar Ativação <ArrowRight size={20} />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
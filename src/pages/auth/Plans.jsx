import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Check, ArrowRight, X, ShieldCheck} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(30); 
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data } = await api.get('/identity/plans');
        // Filtra apenas ativos E remove planos cortesia/trial da vitrine pública de compra
        const publicPlans = data.filter(p => p.is_active && p.type !== 'cortesia' && p.type !== 'trial');
        
        // Ordena por preço
        const sortedPlans = publicPlans.sort((a, b) => a.price_monthly - b.price_monthly);
        setPlans(sortedPlans);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar planos.");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const getPrice = (plan) => {
    if (selectedDuration === 30) return plan.price_monthly;
    if (selectedDuration === 180) return plan.price_180days;
    if (selectedDuration === 365) return plan.price_annual;
    return 0;
  };

  const getLabelDuration = () => {
    if (selectedDuration === 30) return "/mês";
    if (selectedDuration === 180) return "/semestre";
    if (selectedDuration === 365) return "/ano";
  }

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleConfirmInterest = async (data) => {
    try {
        await api.post('/support/tickets', {
            subject: `Interesse no Plano: ${selectedPlan.name} (${selectedDuration} dias)`,
            message: `Usuário ${user.name} tem interesse no plano ${selectedPlan.name}.\nWhatsapp: ${data.whatsapp1} / ${data.whatsapp2}\nValor Previsto: ${formatCurrency(getPrice(selectedPlan))}`
        });
        
        toast.success("Recebemos seu interesse! Entraremos em contato via WhatsApp.");
        setShowModal(false);
        reset();
        
        // Se for upgrade, volta pro settings, se for onboarding, vai pro dashboard
        if (window.location.pathname.includes('dashboard')) {
            navigate('/dashboard/settings');
        } else {
            navigate('/dashboard');
        }
        
    } catch (error) {
        toast.error("Erro ao enviar solicitação.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400">Carregando planos...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Escolha o plano ideal para seu negócio</h1>
        <p className="text-gray-500 text-lg">Gerencie seu mercado com tecnologia de ponta. Cancele quando quiser.</p>
        
        {/* Toggle de Duração */}
        <div className="flex items-center justify-center gap-2 mt-8 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-fit mx-auto">
            {[
                { label: 'Mensal', days: 30 },
                { label: 'Semestral (-10%)', days: 180 },
                { label: 'Anual (-20%)', days: 365 }
            ].map((opt) => (
                <button
                    key={opt.days}
                    onClick={() => setSelectedDuration(opt.days)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        selectedDuration === opt.days 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full">
        {plans.map((plan) => {
            const price = getPrice(plan);
            const isRecommended = plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('recomendado');
            
            return (
                <div 
                    key={plan.id} 
                    className={`relative bg-white rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-2 ${
                        isRecommended 
                        ? 'border-2 border-brand-yellow shadow-2xl shadow-yellow-100 ring-4 ring-yellow-50' 
                        : 'border border-gray-200 shadow-xl'
                    }`}
                >
                    {isRecommended && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-yellow text-brand-dark px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                            Mais Popular
                        </div>
                    )}

                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{plan.description || "Para mercados em crescimento"}</p>
                    </div>

                    <div className="mb-6 flex items-end gap-1">
                        <span className="text-4xl font-black text-gray-900">{formatCurrency(price).replace(',00', '')}</span>
                        <span className="text-gray-500 font-medium mb-1.5">{getLabelDuration()}</span>
                    </div>

                    <Button 
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full py-6 font-bold text-lg mb-8 ${isRecommended ? 'bg-brand-yellow text-brand-dark' : 'bg-gray-900 text-white'}`}
                    >
                        Assinar Agora
                    </Button>

                    <div className="space-y-4 flex-1">
                        <FeatureItem text={`${plan.max_users} Usuários`} />
                        <FeatureItem text={`${plan.max_terminals} Caixas PDV`} />
                        <FeatureItem text="Suporte Prioritário" highlighted={isRecommended} />
                        <FeatureItem text="Dashboard Financeiro" highlighted={isRecommended} />
                        <FeatureItem text="Emissão Fiscal NFC-e" highlighted={isRecommended} />
                        <FeatureItem text="Backup Automático" />
                    </div>
                </div>
            );
        })}
      </div>

      <p className="mt-12 text-gray-400 text-sm flex items-center gap-2">
          <ShieldCheck size={16} /> Pagamento seguro e sem fidelidade.
      </p>

      {/* MODAL DE CONTATO */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Quase lá! 🚀</h3>
                    <button onClick={() => setShowModal(false)}><X className="text-gray-400" /></button>
                </div>
                
                <form onSubmit={handleSubmit(handleConfirmInterest)} className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                        <p className="font-bold mb-1">Confirmação de Plano</p>
                        <p>Você escolheu o plano <strong>{selectedPlan.name}</strong>.</p>
                        <p className="mt-2">Para ativar, precisamos alinhar o pagamento. Informe seu WhatsApp e nosso time entrará em contato em instantes.</p>
                    </div>

                    <Input label="WhatsApp Principal" placeholder="(00) 00000-0000" {...register('whatsapp1', { required: true })} autoFocus />
                    <Input label="WhatsApp Secundário (Opcional)" placeholder="(00) 00000-0000" {...register('whatsapp2')} />

                    <div className="pt-4">
                        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting}>
                            Confirmar Interesse <ArrowRight size={20} />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

const FeatureItem = ({ text, highlighted }) => (
    <div className={`flex items-center gap-3 ${highlighted ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
        <div className={`rounded-full p-1 ${highlighted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            <Check size={12} strokeWidth={4} />
        </div>
        <span>{text}</span>
    </div>
);
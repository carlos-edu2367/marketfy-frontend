import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { subscribePlan } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  FileText,
  Gift,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

const BILLING_PERIODS = [
  { label: 'Mensal', value: 30, economy: null, suffix: '/mês' },
  { label: 'Semestral', value: 180, economy: 'Economize 5%', suffix: '/semestre' },
  { label: 'Anual', value: 365, economy: 'Economize 10%', suffix: '/ano' },
];

const formatLimit = (value, suffix) => {
  const numericValue = Number(value);
  return numericValue > 0 ? `Até ${numericValue} ${suffix}` : 'Limite não incluído';
};

const formatFiscalLimit = (value) => {
  const numericValue = Number(value);
  return numericValue > 0
    ? `${numericValue.toLocaleString('pt-BR')} emissões fiscais por mês`
    : 'Emissões fiscais não incluídas';
};

const getPeriod = (days) => BILLING_PERIODS.find((period) => period.value === days) || BILLING_PERIODS[0];

const PlanLimit = ({ icon: Icon, children, tone = 'default' }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
    <Icon size={18} className={tone === 'accent' ? 'mt-0.5 shrink-0 text-brand-yellow' : 'mt-0.5 shrink-0 text-gray-400'} />
    <span className="text-sm leading-5 text-gray-700">{children}</span>
  </div>
);

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [trialPlan, setTrialPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [billingMode, setBillingMode] = useState('invoice');
  const [document, setDocument] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const showTrial = !user?.plan_id;
  const selectedPeriod = getPeriod(selectedDuration);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data } = await api.get('/identity/plans');
        const activePlans = data.filter((plan) => plan.is_active);
        const publicPlans = activePlans
          .filter((plan) => plan.type === 'pago')
          .sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));

        setTrialPlan(activePlans.find((plan) => plan.type === 'trial') || null);
        setPlans(publicPlans);
      } catch (error) {
        console.error('Erro ao carregar planos', error);
        toast.error('Não foi possível carregar as opções de planos.');
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

  const getDurationKey = (days) => {
    if (days === 30) return 'monthly';
    if (days === 180) return 'semiannual';
    if (days === 365) return 'annual';
    return 'monthly';
  };

  const handleContract = async (event) => {
    event?.preventDefault?.();
    if (billingMode === 'recurring' && document.replace(/\D/g, '').length < 11) {
      toast.error('Informe um CPF ou CNPJ válido para cobrança recorrente.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await subscribePlan({
        plan_id: selectedPlan.id,
        subscription_type: getDurationKey(selectedDuration),
        billing_mode: billingMode,
        document: billingMode === 'recurring' ? document : undefined,
      });

      if (billingMode === 'invoice') {
        toast.success('Fatura criada. Clique em Pagar para gerar o checkout.');
        setShowModal(false);
        await refreshUser();
        navigate('/dashboard/settings?tab=invoices');
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      toast.success('Assinatura iniciada. Acompanhe suas faturas em Configurações.');
      setShowModal(false);
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao iniciar assinatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateTrial = async () => {
    try {
      setActivatingTrial(true);
      await api.post('/auth/trial', {});
      await refreshUser();
      toast.success('Período de testes ativado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao ativar trial.');
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

  const recommendedPlanId = plans.length >= 3 ? plans[Math.floor(plans.length / 2)].id : null;
  const cardCount = plans.length + (showTrial ? 1 : 0);
  const gridColumns = cardCount === 1
    ? 'lg:grid-cols-1'
    : cardCount === 2
      ? 'lg:grid-cols-2'
      : cardCount >= 4
        ? 'lg:grid-cols-3 xl:grid-cols-4'
        : 'lg:grid-cols-3';

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans text-gray-800">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-black tracking-tight text-gray-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-yellow text-lg text-brand-dark shadow-sm">M</div>
            <span className="text-xl">Marketfy</span>
          </div>
          <div className="text-right text-xs text-gray-500 sm:text-sm">
            <span className="hidden sm:inline">Você está logado como </span>
            <span className="font-bold text-gray-900">{user?.name || 'usuário'}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {user?.plan_expiration && new Date(user.plan_expiration) < new Date() && (
          <div className="mx-auto mb-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 sm:items-center sm:justify-center">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 sm:mt-0" />
            <span>Seu plano expirou. Escolha uma opção para continuar vendendo pelo Marketfy.</span>
          </div>
        )}

        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-yellow-800">
            <BadgeCheck size={15} /> Planos simples e transparentes
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-gray-950 sm:text-5xl">
            Venda mais com a operação sob controle.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg">
            Tenha PDV, gestão e emissão fiscal em um só lugar. Compare os limites e escolha o plano que acompanha o crescimento do seu negócio.
          </p>
        </section>

        <section className="mx-auto mt-9 flex max-w-xl flex-col items-center gap-3" aria-label="Período de cobrança">
          <div className="flex w-full flex-wrap justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm sm:w-auto">
            {BILLING_PERIODS.map((period) => (
              <button
                key={period.value}
                type="button"
                aria-pressed={selectedDuration === period.value}
                onClick={() => setSelectedDuration(period.value)}
                className={`min-w-[104px] rounded-xl px-3 py-2.5 text-sm font-bold transition-all sm:min-w-[130px] ${
                  selectedDuration === period.value
                    ? 'bg-gray-950 text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {period.label}
                {period.economy && (
                  <span className={`mt-0.5 block text-[10px] font-semibold ${selectedDuration === period.value ? 'text-brand-yellow' : 'text-emerald-600'}`}>
                    {period.economy}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">Cancele quando quiser. Sem fidelidade.</p>
        </section>

        {loading ? (
          <div className="flex justify-center py-24" role="status" aria-label="Carregando planos">
            <Loader2 className="animate-spin text-brand-yellow" size={40} />
          </div>
        ) : (
          <section className={`mt-10 grid grid-cols-1 items-stretch justify-items-center gap-5 md:grid-cols-2 ${gridColumns}`} aria-label="Planos disponíveis">
            {showTrial && (
              <article className="relative flex h-full w-full max-w-[380px] flex-col overflow-hidden rounded-3xl border-2 border-brand-yellow bg-gradient-to-b from-yellow-50 to-white p-6 shadow-lg shadow-yellow-100/60">
                <div className="absolute right-0 top-0 rounded-bl-2xl bg-brand-yellow px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-dark">
                  Comece sem risco
                </div>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-yellow text-brand-dark shadow-sm">
                  <Gift size={22} />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-yellow-800">Experimente antes de decidir</p>
                <h2 className="text-2xl font-black tracking-tight text-gray-950">Teste grátis por 14 dias</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">Conheça os recursos do Marketfy com tempo para configurar sua operação e testar o fluxo completo.</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight text-gray-950">R$ 0</span>
                  <span className="pb-1 text-sm font-medium text-gray-500">por 14 dias</span>
                </div>
                <div className="mt-6 space-y-2.5">
                  <PlanLimit icon={ReceiptText} tone="accent">{formatFiscalLimit(trialPlan?.fiscal_monthly_limit)}</PlanLimit>
                  <PlanLimit icon={Check}>Acesso aos recursos PRO</PlanLimit>
                  <PlanLimit icon={ShieldCheck}>Sem cartão de crédito</PlanLimit>
                </div>
                <div className="mt-auto pt-7">
                  <Button
                    onClick={handleActivateTrial}
                    isLoading={activatingTrial}
                    aria-label="Ativar teste grátis"
                    className="h-12 w-full bg-gray-950 font-bold text-white shadow-lg hover:bg-gray-800"
                  >
                    Ativar teste grátis <ArrowRight size={18} />
                  </Button>
                  <p className="mt-3 text-center text-xs text-gray-500">Sem cobrança automática.</p>
                </div>
              </article>
            )}

            {plans.map((plan) => {
              const isRecommended = plan.id === recommendedPlanId;
              return (
                <article
                  key={plan.id}
                  className={`relative flex h-full w-full max-w-[380px] flex-col rounded-3xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
                    isRecommended ? 'border-gray-950 shadow-lg shadow-gray-200/70' : 'border-gray-200 shadow-sm'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-6 rounded-full bg-gray-950 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                      Mais escolhido
                    </div>
                  )}
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Plano Marketfy</p>
                      <h2 className="text-2xl font-black tracking-tight text-gray-950">{plan.name}</h2>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-700">
                      <CreditCard size={19} />
                    </div>
                  </div>
                  <p className="min-h-[48px] text-sm leading-6 text-gray-500">{plan.description || 'Para negócios que querem vender com mais organização.'}</p>

                  <div className="mt-5 border-y border-gray-100 py-5">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black tracking-tight text-gray-950">{formatCurrency(getPrice(plan))}</span>
                      <span className="pb-1 text-sm font-medium text-gray-400">{selectedPeriod.suffix}</span>
                    </div>
                    {selectedDuration !== 30 && (
                      <p className="mt-1 text-xs font-semibold text-emerald-600">Melhor valor para manter sua operação ativa.</p>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Limites do plano</p>
                    <div className="space-y-2">
                      <PlanLimit icon={Store} tone="accent">{formatLimit(plan.max_markets, 'lojas')}</PlanLimit>
                      <PlanLimit icon={ShieldCheck} tone="accent">{formatLimit(plan.max_terminals, 'caixas')}</PlanLimit>
                      <PlanLimit icon={ReceiptText} tone="accent">{formatFiscalLimit(plan.fiscal_monthly_limit)}</PlanLimit>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> PDV e gestão em um só lugar</div>
                    <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Suporte incluído</div>
                    <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Sem fidelidade</div>
                  </div>

                  <div className="mt-auto pt-7">
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      variant={isRecommended ? 'primary' : 'secondary'}
                      className={`h-12 w-full font-bold ${isRecommended ? '' : 'border-2 border-gray-100 hover:border-brand-yellow hover:bg-yellow-50'}`}
                    >
                      Escolher plano <ArrowRight size={18} />
                    </Button>
                    <p className="mt-3 text-center text-xs text-gray-400">Pagamento seguro e ativação rápida.</p>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!loading && plans.length === 0 && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            Nenhum plano está disponível no momento. Tente novamente em instantes.
          </div>
        )}
      </main>

      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="contract-title">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Fechar contratação"
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="mb-6 pr-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-yellow-700">Quase lá</p>
              <h2 id="contract-title" className="text-2xl font-black tracking-tight text-gray-950">Ative seu plano em poucos passos</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">Escolha a forma de cobrança e siga para o pagamento seguro.</p>
            </div>

            <form onSubmit={handleContract} className="space-y-5">
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-950">
                <div className="mb-3 flex items-center gap-2 font-bold"><FileText size={17} /> Resumo do pedido</div>
                <div className="flex items-center justify-between gap-4"><span className="text-yellow-800">Plano</span><strong>{selectedPlan.name}</strong></div>
                <div className="mt-2 flex items-center justify-between gap-4"><span className="text-yellow-800">Período</span><strong>{selectedPeriod.label}</strong></div>
                <div className="mt-2 flex items-center justify-between gap-4"><span className="text-yellow-800">Valor</span><strong>{formatCurrency(getPrice(selectedPlan))}</strong></div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-bold text-gray-700">Como você quer pagar?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={billingMode === 'invoice'}
                    onClick={() => setBillingMode('invoice')}
                    className={`rounded-xl border-2 p-3 text-left text-sm transition-colors ${billingMode === 'invoice' ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="flex items-center gap-2 font-bold"><FileText size={16} /> Fatura por período</span>
                    <span className="mt-1 block text-xs text-gray-500">Você paga a cada ciclo.</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={billingMode === 'recurring'}
                    onClick={() => setBillingMode('recurring')}
                    className={`rounded-xl border-2 p-3 text-left text-sm transition-colors ${billingMode === 'recurring' ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="flex items-center gap-2 font-bold"><CreditCard size={16} /> Cobrança recorrente</span>
                    <span className="mt-1 block text-xs text-gray-500">Renovação automática.</span>
                  </button>
                </div>
              </fieldset>

              {billingMode === 'recurring' && (
                <Input label="CPF ou CNPJ" placeholder="Somente números" value={document} onChange={(event) => setDocument(event.target.value)} autoFocus />
              )}

              <Button type="submit" variant="primary" size="lg" className="h-12 w-full font-bold" isLoading={submitting}>
                Ir para o pagamento <ArrowRight size={19} />
              </Button>
              <p className="text-center text-xs leading-5 text-gray-400">Você será direcionado para concluir o pagamento com segurança.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

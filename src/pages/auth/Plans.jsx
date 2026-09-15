import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { subscribePlan } from '../../lib/api';
import { fetchInvoiceCheckoutUrl } from '../../lib/invoiceCheckout';
import { fetchSubscriptionCheckoutUrl } from '../../lib/subscriptionCheckout';
import { clearPlanIntent, readPlanIntent } from '../../lib/planIntent';
import { useAuth } from '../../hooks/useAuth';
import { usePublicPlans } from '../../hooks/usePublicPlans';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import BillingCycleToggle from '../../components/billing/BillingCycleToggle';
import PlanCard from '../../components/billing/PlanCard';
import PlanIncludesStrip from '../../components/billing/PlanIncludesStrip';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  FileText,
  Gift,
  LifeBuoy,
  Loader2,
  LogOut,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import { formatFiscalLimit, getCycleTotal, getRecommendedPlanId } from '../../lib/pricing';
import { track } from '../../lib/analytics';

// Estagio do usuario em relacao ao plano, usado para adaptar o titulo da
// pagina (visitante novo, trial ativo, plano expirado ou renovacao/upgrade).
function getStage(user, subscription) {
  if (!user?.plan_id) return 'new';
  if (user.plan_expiration && new Date(user.plan_expiration) < new Date()) return 'expired';
  if (subscription?.status === 'trialing') return 'trialing';
  return 'renew';
}

const STAGE_COPY = {
  new: {
    title: 'Comece grátis por 14 dias',
    subtitle: 'Sem cartão de crédito. Escolha um plano pago só quando quiser.',
  },
  trialing: {
    title: 'Seu teste grátis está ativo',
    subtitle: 'Assine agora para continuar vendendo sem interrupção quando o teste terminar. Tudo que você já cadastrou continua aqui.',
  },
  expired: {
    title: 'Suas vendas e seus clientes estão salvos',
    subtitle: 'Reative seu plano para voltar a vender. Leva menos de 2 minutos.',
  },
  renew: {
    title: 'Veja o que muda ao trocar de plano',
    subtitle: 'Compare os limites de cada plano e assine quando fizer sentido para o seu negócio.',
  },
};

export default function Plans() {
  const { plans, trialPlan, loading } = usePublicPlans();
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [planIntent, setPlanIntent] = useState(() => readPlanIntent());
  const [cycleKey, setCycleKey] = useState(() => planIntent?.cycle || 'monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [billingMode, setBillingMode] = useState('invoice');
  const [billingDocument, setBillingDocument] = useState('');
  const [useRegisteredDocument, setUseRegisteredDocument] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(null);
  const modalRef = useRef(null);

  const { user, subscription, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const registeredDocument = user?.document_masked || null;
  const showTrial = !user?.plan_id;
  const stage = getStage(user, subscription);
  const stageCopy = STAGE_COPY[stage];

  const intendedPlan = planIntent ? plans.find((plan) => plan.id === planIntent.planId) : null;

  const handleDismissIntent = () => {
    clearPlanIntent();
    setPlanIntent(null);
  };

  useEffect(() => {
    if (!showModal) return undefined;
    const previouslyFocused = document.activeElement;
    modalRef.current?.querySelector('[data-autofocus]')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowModal(false);
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [showModal]);

  const handleSelectPlan = (plan) => {
    track('checkout_modal_opened', { plan_id: plan.id });
    setSelectedPlan(plan);
    setBillingMode('invoice');
    setBillingDocument('');
    setUseRegisteredDocument(true);
    setCheckoutIdempotencyKey(`mktf-sub:${user?.id || 'anon'}:${plan.id}:${Date.now()}`);
    setShowModal(true);
  };

  const handleContract = async (event) => {
    event?.preventDefault?.();
    const typesDocument = billingMode === 'recurring' && !(registeredDocument && useRegisteredDocument);
    if (typesDocument && billingDocument.replace(/\D/g, '').length < 11) {
      toast.error('Informe um CPF ou CNPJ válido para cobrança recorrente.');
      return;
    }

    track('checkout_started', {
      plan_id: selectedPlan.id, billing_mode: billingMode, subscription_type: cycleKey,
    });

    try {
      setSubmitting(true);
      const { data } = await subscribePlan({
        plan_id: selectedPlan.id,
        subscription_type: cycleKey,
        billing_mode: billingMode,
        document: typesDocument ? billingDocument : undefined,
        idempotency_key: checkoutIdempotencyKey,
      });
      clearPlanIntent();

      if (billingMode === 'invoice') {
        // A fatura ja existe; se o link nao sair (Billing Core lento/indisponivel)
        // o usuario continua o pagamento pela aba Faturas, sem erro de assinatura.
        const checkoutUrl = data.invoice_id
          ? await fetchInvoiceCheckoutUrl(data.invoice_id).catch(() => null)
          : null;
        if (checkoutUrl) {
          track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'redirected_to_payment' });
          window.location.href = checkoutUrl;
          return;
        }
        track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'invoice_pending' });
        toast.success('Fatura gerada! O link de pagamento fica disponível em Configurações > Faturas.');
        setShowModal(false);
        await refreshUser();
        navigate('/dashboard/settings?tab=invoices');
        return;
      }

      // recurring: a assinatura ja foi criada, mas o checkout do cartao ainda
      // esta sendo montado no gateway — confirma em polling, igual ao invoice.
      const checkoutUrl = data.subscription_id
        ? await fetchSubscriptionCheckoutUrl(data.subscription_id).catch(() => null)
        : null;
      if (checkoutUrl) {
        track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'redirected_to_payment' });
        window.location.href = checkoutUrl;
        return;
      }
      track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'checkout_link_delayed' });
      toast.error('O link de pagamento está demorando para ficar pronto. Tente novamente em instantes em Configurações.');
      setShowModal(false);
      await refreshUser();
      navigate('/dashboard/settings');
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
      track('trial_activated');
      await refreshUser();
      toast.success('Período de testes ativado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao ativar trial.');
    } finally {
      setActivatingTrial(false);
    }
  };

  const recommendedPlanId = getRecommendedPlanId(plans);

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans text-gray-800">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-black tracking-tight text-gray-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-yellow text-lg text-brand-dark shadow-sm">M</div>
            <span className="text-xl">Marketfy</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-sm text-gray-500 sm:inline">
              Logado como <span className="font-bold text-gray-900">{user?.name || 'usuário'}</span>
            </span>
            {stage !== 'new' && (
              <Button
                as="a"
                href="/dashboard/support"
                variant="ghost"
                size="sm"
                className="font-bold text-gray-500"
              >
                <LifeBuoy size={16} /> Suporte
              </Button>
            )}
            <Button onClick={logout} variant="ghost" size="sm" className="font-bold text-gray-500">
              <LogOut size={16} /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {stage === 'expired' && (
          <div className="mx-auto mb-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 sm:items-center sm:justify-center">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 sm:mt-0" />
            <span>Seu plano expirou. Escolha uma opção para continuar vendendo pelo Marketfy.</span>
          </div>
        )}

        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-yellow-800">
            <BadgeCheck size={15} /> Planos simples e transparentes
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-gray-950 sm:text-5xl">
            {stageCopy.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg">
            {stageCopy.subtitle}
          </p>
        </section>

        {showTrial && trialPlan && (
          <section className="mx-auto mt-9 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border-2 border-brand-yellow bg-gradient-to-r from-yellow-50 to-white p-5 sm:flex-row">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow text-brand-dark shadow-sm sm:flex">
                <Gift size={22} />
              </div>
              <div>
                <p className="font-black text-gray-950">Ainda não testou? 14 dias grátis, sem cartão.</p>
                <p className="text-sm text-gray-500">{formatFiscalLimit(trialPlan?.fiscal_monthly_limit)} incluídas no teste.</p>
              </div>
            </div>
            <Button
              onClick={handleActivateTrial}
              isLoading={activatingTrial}
              className="h-11 shrink-0 bg-gray-950 font-bold text-white hover:bg-gray-800"
            >
              Ativar teste grátis <ArrowRight size={16} />
            </Button>
          </section>
        )}

        {intendedPlan && (
          <section
            aria-label="Plano escolhido"
            className="mx-auto mt-9 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row"
          >
            <p className="text-center text-sm text-gray-600 sm:text-left">
              Você escolheu o <strong className="text-gray-950">{intendedPlan.name}</strong> na página inicial.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={handleDismissIntent}>Ver todos os planos</Button>
              <Button size="sm" className="font-bold" onClick={() => handleSelectPlan(intendedPlan)}>
                Assinar {intendedPlan.name}
              </Button>
            </div>
          </section>
        )}

        <section className="mx-auto mt-9 flex max-w-xl flex-col items-center gap-3" aria-label="Período de cobrança">
          <BillingCycleToggle value={cycleKey} onChange={setCycleKey} theme="light" />
          <p className="text-xs text-gray-500">Cancele quando quiser. Sem fidelidade.</p>
        </section>

        {loading ? (
          <div className="flex justify-center py-24" role="status" aria-label="Carregando planos">
            <Loader2 className="animate-spin text-brand-yellow" size={40} />
          </div>
        ) : (
          <section
            className={`mt-10 grid grid-cols-1 items-stretch justify-items-center gap-6 md:grid-cols-2 ${
              plans.length >= 3 ? 'lg:grid-cols-3' : ''
            }`}
            aria-label="Planos disponíveis"
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycleKey={cycleKey}
                theme="light"
                highlighted={plan.id === recommendedPlanId}
                badgeLabel={plan.id === recommendedPlanId ? 'Recomendado' : null}
                ctaLabel="Assinar plano"
                onCtaClick={() => handleSelectPlan(plan)}
              />
            ))}
          </section>
        )}

        {!loading && plans.length > 0 && <PlanIncludesStrip />}

        {!loading && plans.length === 0 && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            Nenhum plano está disponível no momento. Tente novamente em instantes.
          </div>
        )}

        <section className="mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Rede com várias lojas ou operação de alto volume?{' '}
          <a href="/dashboard/support" className="font-bold text-gray-900 hover:underline">Fale com a gente</a>
          {' '}para montar um plano sob medida.
        </section>
      </main>

      {showModal && selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contract-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <div ref={modalRef} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Fechar contratação"
              data-autofocus
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
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
                <div className="mt-2 flex items-center justify-between gap-4"><span className="text-yellow-800">Período</span><strong>{cycleKey === 'monthly' ? 'Mensal' : cycleKey === 'semiannual' ? 'Semestral' : 'Anual'}</strong></div>
                <div className="mt-2 flex items-center justify-between gap-4"><span className="text-yellow-800">Valor total</span><strong>{formatCurrency(getCycleTotal(selectedPlan, cycleKey))}</strong></div>
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
                    <span className="flex items-center gap-2 font-bold"><FileText size={16} /> Pix ou cartão</span>
                    <span className="mt-1 block text-xs text-gray-500">Você paga a cada período; sem renovação automática.</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={billingMode === 'recurring'}
                    onClick={() => setBillingMode('recurring')}
                    className={`rounded-xl border-2 p-3 text-left text-sm transition-colors ${billingMode === 'recurring' ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="flex items-center gap-2 font-bold"><CreditCard size={16} /> Cartão de crédito</span>
                    <span className="mt-1 block text-xs text-gray-500">Renova automaticamente, você não precisa lembrar.</span>
                  </button>
                </div>
              </fieldset>

              {billingMode === 'recurring' && registeredDocument && (
                <label htmlFor="use-registered-document" className="flex items-start gap-2.5 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
                  <input
                    id="use-registered-document"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={useRegisteredDocument}
                    onChange={(event) => setUseRegisteredDocument(event.target.checked)}
                  />
                  <span>Usar o CPF do cadastro <strong className="font-mono">{registeredDocument}</strong></span>
                </label>
              )}

              {billingMode === 'recurring' && (!registeredDocument || !useRegisteredDocument) && (
                <Input
                  label="CPF ou CNPJ do titular"
                  placeholder="Somente números"
                  inputMode="numeric"
                  value={billingDocument}
                  onChange={(event) => setBillingDocument(event.target.value)}
                  autoFocus
                />
              )}

              <Button type="submit" variant="primary" size="lg" className="h-12 w-full font-bold" isLoading={submitting}>
                Ir para o pagamento <ArrowRight size={19} />
              </Button>
              <p className="text-center text-xs leading-5 text-gray-400">
                {billingMode === 'invoice'
                  ? 'Você será direcionado para pagar com Pix ou cartão.'
                  : 'Você será direcionado para concluir o pagamento com segurança.'}
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Logo from '../components/brand/Logo';
import BillingCycleToggle from '../components/billing/BillingCycleToggle';
import PlanCard from '../components/billing/PlanCard';
import PlanIncludesStrip from '../components/billing/PlanIncludesStrip';
import PlanComparisonTable from '../components/billing/PlanComparisonTable';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { track } from '../lib/analytics';
import { usePublicPlans } from '../hooks/usePublicPlans';
import { getRecommendedPlanId } from '../lib/pricing';

const BILLING_FAQ = [
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: 'PIX ou boleto, com uma fatura a cada período, ou cartão de crédito com renovação automática.',
  },
  {
    question: 'Preciso de cartão para testar?',
    answer: 'Não. O teste grátis de 14 dias não pede cartão nem gera cobrança.',
  },
  {
    question: 'O que acontece se a fatura vencer?',
    answer: 'Na cobrança por PIX ou boleto você tem 3 dias de tolerância depois do vencimento. Depois disso o acesso fica bloqueado até o pagamento, e seus dados continuam salvos.',
  },
  {
    question: 'E se eu passar do limite de NFC-e do plano?',
    answer: 'Você compra pacotes de emissões adicionais dentro do sistema, sem trocar de plano.',
  },
];

export default function Pricing() {
  const [cycleKey, setCycleKey] = useState('monthly');
  const { plans, loading } = usePublicPlans();
  const recommendedPlanId = getRecommendedPlanId(plans);

  return (
    <div className="min-h-screen bg-brand-cream font-sans text-brand-ink">
      <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/85 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Logo size={36} />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/login" className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold hover:bg-brand-ink/5">Entrar</Link>
            <Button as={Link} to="/register" variant="ink" size="sm" className="whitespace-nowrap rounded-xl font-bold shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-black hover:shadow-none">Testar grátis</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">Preços do <span className="mf-marker">Marketfy</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 sm:text-lg">
            Comece com 14 dias grátis, sem cartão. Escolha um plano pelos limites que o seu negócio precisa.
          </p>
        </section>

        <div className="mt-9 flex justify-center">
          <BillingCycleToggle value={cycleKey} onChange={setCycleKey} theme="light" />
        </div>

        {loading ? (
          <div className="flex justify-center py-24" role="status" aria-label="Carregando planos">
            <Loader2 className="animate-spin text-brand-ink/40" size={40} />
          </div>
        ) : plans.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-gray-500">Nenhum plano está disponível no momento. Tente novamente em instantes.</p>
        ) : (
          <>
            <section aria-label="Planos" className="mt-10 grid grid-cols-1 items-stretch justify-items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  cycleKey={cycleKey}
                  theme="light"
                  highlighted={plan.id === recommendedPlanId}
                  badgeLabel={plan.id === recommendedPlanId ? 'Recomendado' : null}
                  ctaLabel="Testar grátis"
                  ctaTo={`/register?plan=${plan.id}&cycle=${cycleKey}`}
                  onCtaClick={() => track('plan_cta_clicked', { plan_id: plan.id, cycle: cycleKey })}
                />
              ))}
            </section>
            <PlanIncludesStrip />
            <PlanComparisonTable plans={plans} cycleKey={cycleKey} />
          </>
        )}

        <section aria-labelledby="billing-faq" className="mx-auto mt-14 max-w-3xl">
          <h2 id="billing-faq" className="text-3xl font-black">Dúvidas sobre cobrança</h2>
          <div className="mt-5 space-y-3">
            {BILLING_FAQ.map((item) => (
              <details key={item.question} className="rounded-2xl border-2 border-brand-ink/15 bg-white p-4 transition-all hover:border-brand-ink/40 open:border-brand-ink open:shadow-sticker">
                <summary className="cursor-pointer font-display text-lg font-black">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <CookieConsentBanner />
    </div>
  );
}

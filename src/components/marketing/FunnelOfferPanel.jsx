import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePublicPlans } from '../../hooks/usePublicPlans';
import { getRecommendedPlanId, getMonthlyEquivalent } from '../../lib/pricing';
import { formatCurrency } from '../../lib/utils';
import { trackFunnelEvent } from '../../lib/funnelTracking';

const OFFER_FEATURES = [
  'PDV offline-first',
  'Estoque integrado',
  'Emissão fiscal integrada',
  'Controle de fiado',
  'Controle financeiro',
  'Dashboard financeiro',
];

export default function FunnelOfferPanel({ funnelVariant }) {
  const { plans, loading } = usePublicPlans();
  const [showDownsell, setShowDownsell] = useState(false);

  const recommendedId = getRecommendedPlanId(plans);
  const recommendedPlan = plans.find((plan) => plan.id === recommendedId) || plans[0] || null;
  const basicPlan = plans
    .filter((plan) => plan.id !== recommendedPlan?.id)
    .sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0))[0] || null;

  useEffect(() => {
    if (!loading && recommendedPlan) {
      trackFunnelEvent('marketfy_offer_view', { funnelVariant });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recommendedPlan?.id]);

  if (loading || !recommendedPlan) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando oferta">
        <Loader2 className="animate-spin text-brand-yellow" size={36} />
      </div>
    );
  }

  const monthlyPrice = getMonthlyEquivalent(recommendedPlan, 'monthly');

  return (
    <div className="mt-8">
      <div className="grid overflow-hidden rounded-3xl border border-gray-200 shadow-xl md:grid-cols-2">
        <div className="bg-white p-7 sm:p-8">
          <span className="inline-flex rounded-full bg-lime-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-green">
            Configuração recomendada
          </span>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-gray-950">{recommendedPlan.name}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Você não precisa de &ldquo;mais uma tela de vendas&rdquo;. Precisa de uma operação que
            continue funcionando e gere informação pra decisão.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
            {OFFER_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-gray-700">
                <Check size={15} className="shrink-0 text-brand-green" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center bg-gray-950 p-7 text-white sm:p-8">
          <div className="text-xs text-gray-400">
            Valor de referência do pacote
            <br />
            <s>R$ 997,00/mês</s>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold opacity-70">R$</span>
            <span className="text-5xl font-black tracking-tight">
              {monthlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold opacity-70">/mês</span>
          </div>
          <Button
            as={Link}
            to={`/register?plan=${recommendedPlan.id}&cycle=monthly`}
            onClick={() => trackFunnelEvent('marketfy_offer_cta_click', { funnelVariant, plan_id: recommendedPlan.id })}
            className="mt-5 h-12 w-full font-bold"
          >
            Quero o {recommendedPlan.name} <ArrowRight size={18} />
          </Button>
          {basicPlan && !showDownsell && (
            <button
              type="button"
              onClick={() => {
                setShowDownsell(true);
                trackFunnelEvent('marketfy_offer_decline', { funnelVariant });
              }}
              className="mt-3 text-xs text-gray-400 underline underline-offset-4 hover:text-gray-200"
            >
              Quero começar com algo mais enxuto
            </button>
          )}
        </div>
      </div>

      {basicPlan && showDownsell && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
            Plano de entrada
          </span>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-black text-gray-950">{basicPlan.name}</h4>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Mesma base operacional, com menor capacidade de emissões fiscais e sem dashboard
                financeiro avançado.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-gray-950">
                {formatCurrency(getMonthlyEquivalent(basicPlan, 'monthly'))}
                <span className="text-sm font-bold text-gray-400">/mês</span>
              </div>
              <Button
                as={Link}
                to={`/register?plan=${basicPlan.id}&cycle=monthly`}
                onClick={() => trackFunnelEvent('marketfy_downsell_cta_click', { funnelVariant, plan_id: basicPlan.id })}
                className="mt-2 font-bold"
              >
                Escolher {basicPlan.name}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * PlanGuard: protege rotas baseadas na feature liberada pelo plano.
 *
 * Fonte de verdade: subscription.features (GET /billing/subscription),
 * decidido pelo backend em plan_access_service.get_plan_features. O
 * PlanGuard e apenas UX — o backend sempre valida a feature na request real.
 *
 * Props:
 *   feature  (string) — chave da feature a verificar (ex: 'finance', 'reports', 'fiscal')
 *   children — componente protegido
 */
const FEATURE_LABELS = {
  finance: 'o Financeiro',
  reports: 'os Relatórios avançados',
  fiscal: 'a Emissão de NFC-e',
};

export default function PlanGuard({ children, feature }) {
  const { user, subscription, loading } = useAuth();

  if (loading) return null;

  // 1. Verificação por feature (backend-driven) — fonte de verdade.
  if (feature && subscription?.features) {
    const hasFeature = subscription.features[feature] === true;
    if (!hasFeature) {
      return <UpgradeScreen feature={feature} />;
    }
    return children;
  }

  // 2. Fallback apenas quando o backend ainda não respondeu com `features`
  // (ex.: subscription ainda carregando). Não usa nome de plano como regra
  // de negocio — planos sao definidos pelo admin e podem mudar de nome.
  if (!user?.plan_id) {
    return <UpgradeScreen feature={feature} />;
  }

  return children;
}

function UpgradeScreen({ feature }) {
  const featureLabel = FEATURE_LABELS[feature] || 'esta funcionalidade';
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-gray-50">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl max-w-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Lock size={120} />
        </div>

        <div className="w-20 h-20 bg-brand-yellow rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-200">
          <Crown size={40} className="text-brand-dark" />
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Funcionalidade indisponível no seu plano</h1>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
          Seu plano atual não inclui {featureLabel}. Veja os planos disponíveis para desbloquear.
        </p>

        <div className="space-y-4">
          <Button
            as={Link}
            to="/plans"
            size="xl"
            className="w-full font-bold shadow-lg bg-gray-900 text-white hover:bg-gray-800"
          >
            Ver planos <ArrowRight size={20} className="ml-2" />
          </Button>
          <p className="text-xs text-gray-400">
            Dúvidas?{' '}
            <Link to="/dashboard/support" className="underline hover:text-gray-600">
              Fale com o suporte
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

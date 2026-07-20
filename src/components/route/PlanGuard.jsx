import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * PlanGuard: protege rotas baseadas no plano/feature do usuário.
 *
 * Prioridade de verificação:
 *   1. subscription.features do backend (fonte de verdade)
 *   2. fallback para plan_name do user (compatibilidade)
 *
 * O PlanGuard é UX — o backend sempre valida a feature na request real.
 *
 * Props:
 *   feature  (string) — chave da feature a verificar (ex: 'finance', 'reports', 'fiscal')
 *             Se omitido, usa lógica legada por nome de plano.
 *   children — componente protegido
 */
export default function PlanGuard({ children, feature }) {
  const { user, subscription, loading } = useAuth();

  if (loading) return null;

  // 1. Verificação por feature (backend-driven)
  if (feature && subscription?.features) {
    const hasFeature = subscription.features[feature] === true;
    if (!hasFeature) {
      return <UpgradeScreen />;
    }
    return children;
  }

  // 2. Fallback: bloqueio por nome de plano (compatibilidade)
  const isBasic =
    !user?.plan_name ||
    user?.plan_name.toLowerCase().includes('básico') ||
    user?.plan_name.toLowerCase().includes('basico') ||
    user?.plan_name.toLowerCase().includes('free');

  if (isBasic) {
    return <UpgradeScreen />;
  }

  return children;
}

function UpgradeScreen() {
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-gray-50">
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl max-w-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Lock size={120} />
        </div>

        <div className="w-20 h-20 bg-brand-yellow rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-200">
          <Crown size={40} className="text-brand-dark" />
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Funcionalidade PRO</h1>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
          Esta funcionalidade é exclusiva para assinantes <strong>Marketfy PRO</strong> ou superior.
          Desbloqueie o Financeiro completo, DRE e Relatórios Avançados agora.
        </p>

        <div className="space-y-4">
          <Link to="/dashboard/settings">
            <Button
              size="xl"
              className="w-full font-bold shadow-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              Fazer Upgrade Agora <ArrowRight size={20} className="ml-2" />
            </Button>
          </Link>
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


import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * PlanGuard: Protege rotas baseadas no nível do plano.
 * @param {children} - O componente da rota protegida.
 * @param {requiredPlan} - String ou Array de planos permitidos (ex: 'Pro' ou ['Pro', 'Business']).
 * OBS: Se o plano for 'Básico', ele bloqueia qualquer requiredPlan que não seja 'Básico'.
 */
export default function PlanGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Lógica de Bloqueio:
  // Se o plano for Básico (ou undefined/null), bloqueamos o acesso.
  // Ajuste a lógica aqui se tiver mais níveis (ex: user.plan_level < requiredLevel)
  const isBasic = !user?.plan_name || 
                  user?.plan_name.toLowerCase().includes('básico') || 
                  user?.plan_name.toLowerCase().includes('basico') ||
                  user?.plan_name.toLowerCase().includes('free');

  if (isBasic) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-gray-50">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl max-w-lg relative overflow-hidden">
          {/* Background Decor */}
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
                <Button size="xl" className="w-full font-bold shadow-lg bg-gray-900 text-white hover:bg-gray-800">
                Fazer Upgrade Agora <ArrowRight size={20} className="ml-2" />
                </Button>
            </Link>
            <p className="text-xs text-gray-400">
              Dúvidas? <Link to="/dashboard/support" className="underline hover:text-gray-600">Fale com o suporte</Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
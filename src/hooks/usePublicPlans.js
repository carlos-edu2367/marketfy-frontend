import { useEffect, useState } from 'react';
import api from '../lib/api';
import { selectPublicPlans, selectTrialPlan } from '../lib/pricing';

/**
 * Fonte unica dos planos publicos para a landing (`/`) e a tela de planos
 * (`/plans`). Consome GET /identity/plans (endpoint publico, sem auth) para
 * que o preco exibido nunca divirja entre as duas telas.
 */
export function usePublicPlans() {
  const [plans, setPlans] = useState([]);
  const [trialPlan, setTrialPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlans() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get('/identity/plans');
        if (cancelled) return;
        setPlans(selectPublicPlans(data));
        setTrialPlan(selectTrialPlan(data));
      } catch (err) {
        if (cancelled) return;
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPlans();
    return () => { cancelled = true; };
  }, []);

  return { plans, trialPlan, loading, error };
}

export default usePublicPlans;

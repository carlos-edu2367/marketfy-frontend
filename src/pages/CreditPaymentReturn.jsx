import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import CreditUsageBar from '../components/fiscal/CreditUsageBar';
import { Button } from '../components/ui/Button';
import api from '../lib/api';

export default function CreditPaymentReturn() {
  const [searchParams] = useSearchParams();
  const [marketId, setMarketId] = useState(searchParams.get('marketId') || '');
  const [balance, setBalance] = useState(null);
  const [polling, setPolling] = useState(false);
  const [activated, setActivated] = useState(false);
  const prevAddonLimitRef = useRef(null);

  useEffect(() => {
    if (marketId) return;
    api.get('/identity/markets')
      .then(({ data }) => setMarketId(data?.[0]?.id || ''))
      .catch(() => toast.error('Erro ao carregar loja.'));
  }, [marketId]);

  useEffect(() => {
    if (!marketId) return undefined;
    let cancelled = false;
    let attempts = 0;
    let timerId;

    async function pollBalance() {
      attempts += 1;
      setPolling(true);
      try {
        const { data } = await api.get(`/fiscal/${marketId}/credits/balance`);
        if (!cancelled) {
          const prev = prevAddonLimitRef.current;
          if (prev !== null && data.addon_limit > prev && !activated) {
            const added = data.addon_limit - prev;
            toast.success(`${added} créditos adicionados!`);
            setActivated(true);
          }
          prevAddonLimitRef.current = data.addon_limit;
          setBalance(data);
        }
      } catch {
        if (!cancelled && attempts === 1) {
          toast.error('Ainda não foi possível atualizar o saldo.');
        }
      } finally {
        if (!cancelled && attempts < 15) {
          timerId = setTimeout(pollBalance, 2000);
        } else if (!cancelled) {
          setPolling(false);
        }
      }
    }

    pollBalance();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [marketId, activated]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10 flex items-center justify-center">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm w-full">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${activated ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50'}`}>
          {activated ? <CheckCircle2 size={44} /> : <Clock size={44} className="animate-spin" />}
        </div>
        <h1 className="text-3xl font-black text-gray-900">
          {activated ? 'Créditos ativados com sucesso!' : 'Processamento de pagamento'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">
          {activated
            ? 'Seus créditos já estão disponíveis e prontos para uso em suas emissões fiscais.'
            : 'Seu pagamento está sendo processado. Os créditos serão liberados em instantes.'}
        </p>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left">
          {activated && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-black text-green-700">
              <CheckCircle2 size={18} />
              Créditos ativos!
            </div>
          )}
          {polling && !balance ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              Aguardando confirmação e atualizando saldo...
            </div>
          ) : balance ? (
            <div className="space-y-4">
              <p className="text-center text-sm font-black text-green-700">
                {balance.remaining} créditos disponíveis
              </p>
              <CreditUsageBar
                used={balance.used_count}
                includedLimit={balance.included_limit}
                addonLimit={balance.addon_limit}
                addonTotal={balance.addon_total || 0}
                period={balance.period}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-6 text-sm font-bold text-yellow-700">
              <Loader2 size={18} className="animate-spin text-yellow-600" />
              Aguardando liberação automática do gateway...
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={`/dashboard/fiscal/credits?marketId=${marketId}`}>
            <Button className="font-black">Voltar para créditos</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

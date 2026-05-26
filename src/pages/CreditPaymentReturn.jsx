import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import CreditUsageBar from '../components/fiscal/CreditUsageBar';
import { Button } from '../components/ui/Button';
import api from '../lib/api';

function statusContent(status, marketId) {
  if (status === 'failure') {
    return {
      icon: XCircle,
      color: 'text-red-600 bg-red-50',
      title: 'Pagamento nao aprovado',
      message: 'Nao foi possivel processar o pagamento. Tente novamente ou escolha outro metodo.',
      actions: (
        <>
          <Link to={`/fiscal/credits?marketId=${marketId}`}>
            <Button>Tentar novamente</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary">Voltar</Button>
          </Link>
        </>
      ),
    };
  }

  if (status === 'pending') {
    return {
      icon: Clock,
      color: 'text-yellow-700 bg-yellow-50',
      title: 'Pagamento em processamento',
      message: 'Seu pagamento esta sendo analisado pelo Mercado Pago. Os creditos serao adicionados automaticamente quando confirmado.',
      actions: (
        <Link to={`/fiscal/credits?marketId=${marketId}`}>
          <Button variant="secondary">Voltar para o painel</Button>
        </Link>
      ),
    };
  }

  return {
    icon: CheckCircle2,
    color: 'text-green-700 bg-green-50',
    title: 'Pagamento realizado com sucesso',
    message: 'Seus creditos estao sendo ativados e estarao disponiveis em instantes.',
    actions: (
      <Link to={`/fiscal/credits?marketId=${marketId}`}>
        <Button>Ver saldo de creditos</Button>
      </Link>
    ),
  };
}

export default function CreditPaymentReturn() {
  const [searchParams] = useSearchParams();
  const [marketId, setMarketId] = useState(searchParams.get('marketId') || '');
  const [balance, setBalance] = useState(null);
  const [polling, setPolling] = useState(false);
  const status = searchParams.get('status') || 'success';
  const content = statusContent(status, marketId);
  const Icon = content.icon;

  useEffect(() => {
    if (marketId) return;
    api.get('/identity/markets')
      .then(({ data }) => setMarketId(data?.[0]?.id || ''))
      .catch(() => toast.error('Erro ao carregar loja.'));
  }, [marketId]);

  useEffect(() => {
    if (status !== 'success' || !marketId) return undefined;
    let cancelled = false;
    let attempts = 0;
    let timerId;

    async function pollBalance() {
      attempts += 1;
      setPolling(true);
      try {
        const { data } = await api.get(`/fiscal/${marketId}/credits/balance`);
        if (!cancelled) setBalance(data);
      } catch {
        if (!cancelled && attempts === 1) {
          toast.error('Ainda nao foi possivel atualizar o saldo.');
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
  }, [marketId, status]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${content.color}`}>
          <Icon size={44} />
        </div>
        <h1 className="text-3xl font-black text-gray-900">{content.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">{content.message}</p>

        {status === 'success' && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left">
            {polling && !balance ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                Atualizando saldo...
              </div>
            ) : balance ? (
              <div className="space-y-4">
                <p className="text-center text-sm font-black text-green-700">
                  {balance.remaining} creditos disponiveis
                </p>
                <CreditUsageBar
                  used={balance.used_count}
                  includedLimit={balance.included_limit}
                  addonLimit={balance.addon_limit}
                  period={balance.period}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-6 text-sm font-bold text-yellow-700">
                <AlertTriangle size={18} />
                Aguardando ativacao dos creditos.
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {content.actions}
        </div>
      </div>
    </main>
  );
}


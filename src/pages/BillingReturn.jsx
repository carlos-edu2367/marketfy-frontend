import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

import api from '../lib/api';
import { Button } from '../components/ui/Button';

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : ms));

export default function BillingReturn() {
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get('tipo') || 'invoice';
  const ref = searchParams.get('ref');
  const [status, setStatus] = useState(null);
  const [provisional, setProvisional] = useState(false);

  useEffect(() => {
    if (tipo !== 'subscription' || !ref) return undefined;
    let cancelled = false;

    async function poll() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        try {
          const { data } = await api.get(`/billing/subscriptions/${ref}/status`);
          if (cancelled) return;
          setStatus(data.status);
          setProvisional(Boolean(data.provisional));
          if (data.status === 'active') return;
        } catch {
          // ignora e tenta de novo no proximo ciclo
        }
        await wait(POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [tipo, ref]);

  const confirmed = status === 'active';

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10 flex items-center justify-center">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm w-full">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${confirmed ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50'}`}>
          {confirmed ? <CheckCircle2 size={44} /> : <Clock size={44} className="animate-spin" />}
        </div>
        <h1 className="text-2xl font-black text-gray-900">
          {confirmed ? 'Acesso liberado!' : 'Pagamento está sendo processado'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-gray-500">
          {confirmed
            ? provisional
              ? 'Seu cartão foi autorizado. Seu acesso já está liberado enquanto confirmamos a primeira cobrança (leva até 1 hora).'
              : 'Sua assinatura está confirmada.'
            : tipo === 'subscription'
              ? 'Aguardando confirmação do Mercado Pago...'
              : 'Seu pagamento está sendo processado. Isso pode levar alguns instantes.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button className="font-black">Ir para o painel</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

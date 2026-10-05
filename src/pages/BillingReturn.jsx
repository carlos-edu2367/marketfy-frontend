import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

import api from '../lib/api';
import { Button } from '../components/ui/Button';
import Logo from '../components/brand/Logo';

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
    <main className="mf-grid-bg min-h-screen bg-brand-yellow p-6 md:p-10 flex flex-col items-center justify-center gap-6">
      <Logo size={44} />
      <div className="mx-auto max-w-lg rounded-[28px] border-2 border-brand-ink bg-white p-8 text-center shadow-sticker-lg w-full">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-brand-ink ${confirmed ? 'text-white bg-brand-green' : 'text-brand-ink bg-brand-yellow'}`}>
          {confirmed ? <CheckCircle2 size={44} /> : <Clock size={44} className="animate-spin" />}
        </div>
        <h1 className="text-3xl font-black text-brand-ink">
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
            <Button variant="ink" className="rounded-xl font-black">Ir para o painel</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

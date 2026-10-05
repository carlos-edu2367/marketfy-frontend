import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X } from 'lucide-react';
import api from '../../lib/api';

const DISMISS_KEY = 'mf_onboarding_checklist_dismissed';

const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

/**
 * Checklist de primeiros passos: Loja → Fiscal → Produtos → Terminal → 1ª venda.
 * O progresso vem da API (config fiscal, produtos e vendas da primeira loja).
 */
export default function OnboardingChecklist({ market }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [progress, setProgress] = useState({ fiscal: false, products: false, sales: false });

  useEffect(() => {
    if (!market?.id || dismissed) return undefined;
    let cancelled = false;
    const safe = (request, pick) => request.then(({ data }) => pick(data)).catch(() => false);
    Promise.all([
      safe(api.get(`/fiscal/${market.id}/config`), (d) => Boolean(d?.enabled)),
      safe(api.get(`/inventory/${market.id}/products`), (d) => Array.isArray(d) && d.length > 0),
      safe(api.get(`/sales/${market.id}`), (d) => Array.isArray(d) && d.length > 0),
    ]).then(([fiscal, products, sales]) => {
      if (!cancelled) setProgress({ fiscal, products, sales });
    });
    return () => { cancelled = true; };
  }, [market?.id, dismissed]);

  if (!market || dismissed) return null;

  const steps = [
    { key: 'market', label: 'Cadastrar a loja', done: true, to: '/dashboard' },
    { key: 'fiscal', label: 'Configurar o fiscal (opcional para começar)', done: progress.fiscal, to: `/dashboard/settings?tab=fiscal&marketId=${market.id}` },
    { key: 'products', label: 'Cadastrar produtos', done: progress.products, to: '/dashboard/inventory' },
    { key: 'terminal', label: 'Abrir o terminal (PDV) e o caixa', done: progress.sales, to: `/pdv/${market.id}` },
    { key: 'sale', label: 'Fazer a primeira venda', done: progress.sales, to: `/pdv/${market.id}` },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const nextKey = steps.find((s) => !s.done)?.key;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* sem storage: só fecha */ }
    setDismissed(true);
  };

  return (
    <section aria-label="Primeiros passos" className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Primeiros passos</h2>
          <p className="text-sm text-gray-500">{doneCount} de {steps.length} concluídos</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dispensar primeiros passos" className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
        <div className="h-full bg-brand-yellow transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50 ${
                step.key === nextKey ? 'bg-yellow-50 text-gray-900' : 'text-gray-600'
              }`}
            >
              {step.done ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-gray-300" />}
              <span className={step.done ? 'line-through opacity-60' : ''}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

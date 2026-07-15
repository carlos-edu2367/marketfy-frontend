import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '../ui/Button';

const STATUS = {
  configured: ['Configurado', 'text-green-700 bg-green-50 border-green-200'],
  missing: ['Pendente', 'text-amber-700 bg-amber-50 border-amber-200'],
  expired: ['Vencida', 'text-red-700 bg-red-50 border-red-200'],
  ambiguous: ['Ambígua', 'text-red-700 bg-red-50 border-red-200'],
};

export default function FiscalCenter({ marketId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!marketId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/fiscal/${marketId}/tax-rule-pendencies`);
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [marketId]);
  const pending = items.filter((item) => item.fiscal_status !== 'configured');

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-label="Central Fiscal">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900">Central Fiscal</h3>
          <p className="mt-1 text-sm text-slate-600">Classificação é definida por regra aprovada pelo contador; EAN e NCM cadastral não criam tributação.</p>
        </div>
        <Button type="button" variant="secondary" onClick={load} disabled={loading} aria-label="Atualizar pendências fiscais">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
        {pending.length ? <AlertTriangle className="text-amber-500" size={18} /> : <CheckCircle2 className="text-green-600" size={18} />}
        {pending.length ? `${pending.length} produto(s) precisam de revisão fiscal.` : 'Todos os produtos ativos estão configurados.'}
      </div>
      <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
        {items.map((item) => {
          const [label, color] = STATUS[item.fiscal_status] || STATUS.missing;
          return <li key={item.product_id} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm"><span className="font-medium text-slate-800">{item.product_name}</span><span className={`rounded-full border px-2 py-1 text-xs font-black ${color}`}>{label}</span></li>;
        })}
      </ul>
    </section>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import FiscalStatusBadge from './FiscalStatusBadge';
import TaxRuleWizard from './TaxRuleWizard';

export default function FiscalCenter({ marketId }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!marketId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/fiscal/${marketId}/tax-rule-pendencies`);
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (requestError) {
      setItems([]);
      setSummary(null);
      setError('Não foi possível carregar as pendências fiscais. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => { load(); }, [load]);
  const pending = items.filter((item) => item.fiscal_status !== 'configured');
  const hasSuccessfulEmptyResponse = !loading && !error && items.length === 0 && summary?.total_active_products >= 0;

  const publishRule = async (payload) => {
    setSaving(true);
    setError('');
    try {
      const { homologation_xml_storage_key: storageKey, ...draft } = payload;
      const { data: rule } = await api.post(`/fiscal/${marketId}/tax-rules`, draft);
      await api.post(`/fiscal/${marketId}/tax-rules/${rule.id}/publish`, {
        homologation_xml_storage_key: storageKey,
      });
      setShowWizard(false);
      await load();
    } catch (requestError) {
      setError('Não foi possível publicar a regra fiscal. Revise as evidências e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-label="Central Fiscal">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900">Central Fiscal</h3>
          <p className="mt-1 text-sm text-slate-600">Classificação exige evidência oficial e revisão responsável; EAN e NCM cadastral não criam tributação.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setShowWizard((open) => !open)}>{showWizard ? 'Fechar assistente' : 'Nova regra fiscal'}</Button>
          <Button type="button" variant="secondary" onClick={load} disabled={loading} aria-label="Atualizar pendências fiscais">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>
      {showWizard && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><TaxRuleWizard onSubmit={publishRule} onCancel={() => setShowWizard(false)} isSubmitting={saving} /></div>}
      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><p>{error}</p><Button type="button" variant="secondary" className="mt-3" onClick={load}>Tentar novamente</Button></div> : (
        <>
          {loading ? <p className="mt-4 text-sm font-medium text-slate-600">Carregando pendências fiscais…</p> : <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            {pending.length ? <AlertTriangle className="text-amber-500" size={18} /> : <CheckCircle2 className="text-green-600" size={18} />}
            {hasSuccessfulEmptyResponse ? 'Todos os produtos ativos estão configurados.' : `${pending.length} produto(s) precisam de revisão fiscal.`}
          </div>}
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
            {items.map((item) => <li key={item.product_id} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm"><span className="font-medium text-slate-800">{item.product_name}</span><FiscalStatusBadge status={item.fiscal_status} /></li>)}
          </ul>
        </>
      )}
    </section>
  );
}

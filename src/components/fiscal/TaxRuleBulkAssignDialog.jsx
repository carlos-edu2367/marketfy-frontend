import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';

export default function TaxRuleBulkAssignDialog({ products, rules, onClose, onConfirm, isSubmitting = false }) {
  const [ruleId, setRuleId] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const replacingPublishedRule = products.some((product) => Boolean(product.tax_rule_id));

  const confirm = async () => {
    if (!ruleId || !productIds.length) {
      setError('Selecione uma regra publicada e ao menos um produto.');
      return;
    }
    if (replacingPublishedRule && reason.trim().length < 3) {
      setError('Informe o motivo para substituir uma regra publicada.');
      return;
    }
    setError('');
    await onConfirm({ tax_rule_id: ruleId, product_ids: productIds, effective_from: effectiveFrom, reason: reason.trim() || 'Atribuição inicial de regra fiscal' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label="Atribuir regra fiscal">
      <div className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div><h2 className="text-xl font-black text-slate-900">Atribuir regra fiscal</h2><p className="text-sm text-slate-600">Confira os produtos abaixo. A atribuição será auditada.</p></div>
        <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm">{products.map((product) => <li key={product.id} className="flex justify-between"><span>{product.name}</span><span className="text-slate-500">{product.fiscal_status}</span></li>)}</ul>
        <label className="block text-sm font-medium text-slate-700">Regra publicada<select aria-label="Regra publicada" value={ruleId} onChange={(event) => setRuleId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2"><option value="">Selecione</option>{rules.filter((rule) => rule.status === 'published').map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Início de vigência<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>
        <label className="block text-sm font-medium text-slate-700">Motivo{replacingPublishedRule ? ' (obrigatório para substituir regra publicada)' : ' (opcional na primeira atribuição)'}<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="button" onClick={confirm} isLoading={isSubmitting}>Atribuir regra</Button></div>
      </div>
    </div>
  );
}

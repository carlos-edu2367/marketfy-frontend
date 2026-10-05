import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import api, { getApiErrorMessage } from '../../../lib/api';
import FunnelStepFrame from '../../funnels/FunnelStepFrame';

export default function FunnelStepsTab({ detail, onChanged, onWarnings }) {
  const { funnel, variants } = detail;
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const variant = variants.find((v) => v.id === variantId) || variants[0];
  const [stepId, setStepId] = useState(variant?.steps[0]?.id);
  const step = variant?.steps.find((s) => s.id === stepId) || variant?.steps[0];
  const [draft, setDraft] = useState({ name: step?.name || '', html: step?.html || '' });

  useEffect(() => { setDraft({ name: step?.name || '', html: step?.html || '' }); }, [step?.id, step?.name, step?.html]);

  const call = async (promise, success) => {
    try {
      const { data } = await promise;
      if (data?.warnings?.length) onWarnings(data.warnings);
      if (success) toast.success(success);
      onChanged();
      return data;
    } catch (error) {
      toast.error(error.response?.data?.detail?.message || getApiErrorMessage(error));
      return null;
    }
  };

  const move = (index, delta) => {
    const ids = variant.steps.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    call(api.put(`/admin/funnels/variants/${variant.id}/steps/order`, { step_ids: ids }));
  };

  const addStep = async () => {
    const data = await call(api.post(`/admin/funnels/variants/${variant.id}/steps`, {
      name: `Etapa ${variant.steps.length + 1}`, html: '<button data-funnel-next>Continuar</button>',
    }));
    if (data?.step) setStepId(data.step.id);
  };

  if (!variant) return null;
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        {variants.map((v) => (
          <div key={v.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${v.id === variant.id ? 'border-slate-900' : ''}`}>
            <button type="button" className="font-bold" onClick={() => { setVariantId(v.id); setStepId(v.steps[0]?.id); }}>{v.name}</button>
            <label className="text-xs text-gray-500">Peso
              <input aria-label={`Peso da variante ${v.name}`} type="number" min="0" defaultValue={v.weight}
                className="ml-1 w-16 rounded border px-1"
                onBlur={(e) => {
                  const weight = Number(e.target.value);
                  if (Number.isInteger(weight) && weight >= 0 && weight !== v.weight) {
                    call(api.patch(`/admin/funnels/variants/${v.id}`, { weight }));
                  }
                }} />
            </label>
            <label className="text-xs text-gray-500 flex items-center gap-1">
              <input type="checkbox" aria-label={`Variante ${v.name} ativa`} checked={v.is_active}
                onChange={(e) => call(api.patch(`/admin/funnels/variants/${v.id}`, { is_active: e.target.checked }))} /> ativa
            </label>
          </div>
        ))}
        <button type="button" onClick={() => call(api.post(`/admin/funnels/variants/${variant.id}/duplicate`), 'Variante duplicada (peso 0).')}
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-600"><Copy size={14} /> Duplicar variante</button>
        <button type="button" onClick={() => call(api.post(`/admin/funnels/${funnel.id}/variants`, { name: String.fromCharCode(65 + variants.length), weight: 0 }), 'Variante criada.')}
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-600"><Plus size={14} /> Nova variante</button>
        {variants.length > 1 && (
          <button type="button" onClick={() => call(api.delete(`/admin/funnels/variants/${variant.id}`), 'Variante removida.')}
            className="inline-flex items-center gap-1 text-sm font-bold text-red-600"><Trash2 size={14} /> Remover variante</button>
        )}
        <a href={`/f/${funnel.slug}?preview=${variant.id}`} target="_blank" rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-slate-900"><ExternalLink size={14} /> Abrir prévia completa</a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_1fr]">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <ul aria-label="Etapas da variante" className="space-y-1">
            {variant.steps.map((s, i) => (
              <li key={s.id} className={`flex items-center gap-1 rounded-lg px-2 py-1 ${s.id === step?.id ? 'bg-gray-100' : ''}`}>
                <button type="button" className="flex-1 text-left text-sm" onClick={() => setStepId(s.id)}>{i + 1}. {s.name}</button>
                <button type="button" aria-label={`Mover ${s.name} para cima`} onClick={() => move(i, -1)} className="p-1 text-gray-500"><ArrowUp size={14} /></button>
                <button type="button" aria-label={`Mover ${s.name} para baixo`} onClick={() => move(i, 1)} className="p-1 text-gray-500"><ArrowDown size={14} /></button>
                <button type="button" aria-label={`Excluir ${s.name}`} onClick={() => call(api.delete(`/admin/funnels/steps/${s.id}`))} className="p-1 text-red-500"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addStep} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-gray-600"><Plus size={14} /> Adicionar etapa</button>
        </div>

        {step ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <label className="text-sm font-bold text-gray-700">Nome da etapa
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="text-sm font-bold text-gray-700 flex-1 flex flex-col">HTML da etapa
              <textarea className="mt-1 flex-1 min-h-[320px] w-full rounded-lg border px-3 py-2 font-mono text-xs" spellCheck={false}
                value={draft.html} onChange={(e) => setDraft({ ...draft, html: e.target.value })} />
            </label>
            <p className="text-xs text-gray-500">Use <code>data-funnel-next</code>, <code>data-funnel-back</code> e <code>data-funnel-finish</code> nos botões, ou <code>Funnel.next()</code> no JS.</p>
            <div><button type="button" className="rounded-lg bg-slate-900 text-white px-4 py-2 font-bold"
              onClick={() => call(api.patch(`/admin/funnels/steps/${step.id}`, draft), 'Etapa salva.')}>Salvar etapa</button></div>
          </div>
        ) : <div className="text-gray-500 p-4">Adicione a primeira etapa.</div>}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden min-h-[420px] flex">
          {step && (
            <FunnelStepFrame html={draft.html} trackingHtml="" title="Prévia da etapa"
              onAction={(a) => toast.success(`Ação disparada: ${a}`)} className="flex-1" />
          )}
        </div>
      </div>
    </div>
  );
}

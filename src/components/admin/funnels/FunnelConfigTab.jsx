import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../../../lib/api';

export default function FunnelConfigTab({ detail, onSaved }) {
  const { funnel } = detail;
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    name: funnel.name, slug: funnel.slug, plan_id: funnel.plan_id || '', tracking_html: funnel.tracking_html || '',
  });

  useEffect(() => {
    api.get('/admin/plans').then(({ data }) => setPlans(data.filter((p) => p.is_active))).catch(() => setPlans([]));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`/admin/funnels/${funnel.id}`, { ...form, plan_id: form.plan_id || null });
      toast.success('Configuração salva.');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.detail?.message || getApiErrorMessage(error));
    }
  };

  const field = 'mt-1 w-full rounded-lg border px-3 py-2';
  return (
    <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-6 grid gap-4 max-w-3xl">
      <label className="text-sm font-bold text-gray-700">Nome
        <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <label className="text-sm font-bold text-gray-700">Slug
        <input className={`${field} font-mono`} value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} required />
        <span className="block text-xs font-normal text-gray-500 mt-1">URL pública: /f/{form.slug}</span>
      </label>
      <label className="text-sm font-bold text-gray-700">Plano de destino
        <select className={field} value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
          <option value="">Selecione…</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-gray-700">Scripts de rastreamento
        <textarea className={`${field} font-mono text-xs h-40`} value={form.tracking_html}
          onChange={(e) => setForm({ ...form, tracking_html: e.target.value })}
          placeholder="Pixels (Meta, Google Ads…). Rodam isolados dentro de cada etapa." />
      </label>
      <div><button type="submit" className="rounded-lg bg-slate-900 text-white px-4 py-2 font-bold">Salvar configuração</button></div>
    </form>
  );
}

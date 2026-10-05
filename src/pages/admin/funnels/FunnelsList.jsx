import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Archive, Copy, Plus } from 'lucide-react';
import api, { getApiErrorMessage } from '../../../lib/api';
import { STATUS_LABEL, formatPct } from '../../../lib/funnelFormat';

export default function FunnelsList() {
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/funnels');
      setFunnels(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar os funis.'));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/admin/funnels', { name: form.name, slug: form.slug });
      navigate(`/admin/funnels/${data.funnel.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail?.message || getApiErrorMessage(error));
    }
  };

  const action = async (funnel, verb) => {
    try {
      await api.post(`/admin/funnels/${funnel.id}/${verb}`);
      toast.success(verb === 'duplicate' ? 'Funil duplicado.' : 'Funil arquivado.');
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900">Funis de venda</h1>
        <button type="button" onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 font-bold">
          <Plus size={16} /> Novo funil
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-4 grid gap-3 sm:grid-cols-3 sm:items-end">
          <label className="text-sm font-bold text-gray-700">Nome
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="text-sm font-bold text-gray-700">Slug
            <input className="mt-1 w-full rounded-lg border px-3 py-2 font-mono" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} required />
          </label>
          <button type="submit" className="rounded-lg bg-brand-yellow px-4 py-2 font-bold">Criar</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Funil</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Variantes</th><th className="px-4 py-3">Sessões (30d)</th>
              <th className="px-4 py-3">Pagos (30d)</th><th className="px-4 py-3">Conversão</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {funnels.map((f) => (
              <tr key={f.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/funnels/${f.id}`)}>
                <td className="px-4 py-3"><div className="font-bold text-gray-900">{f.name}</div>
                  <div className="font-mono text-xs text-gray-500">/f/{f.slug}</div></td>
                <td className="px-4 py-3">{STATUS_LABEL[f.status]}</td>
                <td className="px-4 py-3">{f.variant_count}</td>
                <td className="px-4 py-3">{f.sessions_30d}</td>
                <td className="px-4 py-3">{f.paid_30d}</td>
                <td className="px-4 py-3">{formatPct(f.paid_conversion_30d)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button type="button" aria-label={`Duplicar ${f.name}`} onClick={() => action(f, 'duplicate')} className="p-2 text-gray-500 hover:text-gray-900"><Copy size={16} /></button>
                  {f.status !== 'archived' && (
                    <button type="button" aria-label={`Arquivar ${f.name}`} onClick={() => action(f, 'archive')} className="p-2 text-gray-500 hover:text-gray-900"><Archive size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
            {funnels.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum funil ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../../../lib/api';
import FunnelConfigTab from '../../../components/admin/funnels/FunnelConfigTab';
import FunnelStepsTab from '../../../components/admin/funnels/FunnelStepsTab';
import FunnelMetricsTab from '../../../components/admin/funnels/FunnelMetricsTab';
import { STATUS_LABEL } from '../../../lib/funnelFormat';

const TABS = [['config', 'Configuração'], ['steps', 'Etapas'], ['metrics', 'Métricas']];

export default function FunnelEditor() {
  const { funnelId } = useParams();
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('config');
  const [warnings, setWarnings] = useState([]);
  const [publishErrors, setPublishErrors] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/funnels/${funnelId}`);
      setDetail(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar o funil.'));
    }
  }, [funnelId]);

  useEffect(() => { load(); }, [load]);

  const transition = async (verb) => {
    setPublishErrors([]);
    try {
      const { data } = await api.post(`/admin/funnels/${funnelId}/${verb}`);
      setDetail(data);
      toast.success(verb === 'publish' ? 'Funil publicado.' : 'Status atualizado.');
    } catch (error) {
      const errors = error.response?.data?.detail?.errors;
      if (errors?.length) setPublishErrors(errors);
      else toast.error(getApiErrorMessage(error));
    }
  };

  if (!detail) return null;
  const { funnel } = detail;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/funnels" className="text-sm text-gray-500">← Funis</Link>
        <h1 className="text-2xl font-black text-gray-900">{funnel.name}</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">{STATUS_LABEL[funnel.status]}</span>
        <div className="ml-auto flex gap-2">
          {funnel.status !== 'published'
            ? <button type="button" onClick={() => transition('publish')} className="rounded-lg bg-green-600 text-white px-4 py-2 font-bold">Publicar</button>
            : <button type="button" onClick={() => transition('unpublish')} className="rounded-lg border px-4 py-2 font-bold">Despublicar</button>}
        </div>
      </div>

      {publishErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold mb-1">O funil não pode ser publicado:</p>
          <ul className="list-disc pl-5">{publishErrors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex justify-between gap-4">
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <button type="button" onClick={() => setWarnings([])} className="font-bold">OK</button>
        </div>
      )}

      <div role="tablist" className="flex gap-2 border-b">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`px-4 py-2 font-bold ${tab === key ? 'border-b-2 border-slate-900 text-slate-900' : 'text-gray-500'}`}>{label}</button>
        ))}
      </div>

      {tab === 'config' && <FunnelConfigTab detail={detail} onSaved={load} />}
      {tab === 'steps' && <FunnelStepsTab detail={detail} onChanged={load} onWarnings={setWarnings} />}
      {tab === 'metrics' && <FunnelMetricsTab detail={detail} />}
    </div>
  );
}

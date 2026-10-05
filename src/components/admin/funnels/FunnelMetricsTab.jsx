import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { getApiErrorMessage } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { formatPct } from '../../../lib/funnelFormat';

const Card = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <div className="text-xs font-bold uppercase text-gray-500">{label}</div>
    <div className="text-2xl font-black text-gray-900 mt-1">{value}</div>
  </div>
);

export default function FunnelMetricsTab({ detail }) {
  const [filters, setFilters] = useState({ from: '', to: '', variant_id: '', utm_source: '', utm_campaign: '' });
  const [data, setData] = useState(null);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.get(`/admin/funnels/${detail.funnel.id}/metrics`, { params })
      .then(({ data: result }) => setData(result))
      .catch((error) => toast.error(getApiErrorMessage(error, 'Não foi possível carregar as métricas.')));
  }, [detail.funnel.id, filters]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const input = 'mt-1 rounded-lg border px-2 py-1';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end text-sm">
        <label className="font-bold text-gray-700">De<input type="date" className={`${input} block`} value={filters.from} onChange={set('from')} /></label>
        <label className="font-bold text-gray-700">Até<input type="date" className={`${input} block`} value={filters.to} onChange={set('to')} /></label>
        <label className="font-bold text-gray-700">Variante
          <select className={`${input} block`} value={filters.variant_id} onChange={set('variant_id')}>
            <option value="">Todas</option>
            {detail.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="font-bold text-gray-700">utm_source<input className={`${input} block`} value={filters.utm_source} onChange={set('utm_source')} /></label>
        <label className="font-bold text-gray-700">utm_campaign<input className={`${input} block`} value={filters.utm_campaign} onChange={set('utm_campaign')} /></label>
      </div>

      {data && (
        <>
          {data.maturing && (
            <p className="text-xs text-amber-700">Coortes recentes ainda estão amadurecendo: conversões podem acontecer depois do período.</p>
          )}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card label="Sessões" value={data.summary.sessions} />
            <Card label="Cadastros" value={data.summary.registered} />
            <Card label="Pagamentos" value={data.summary.paid} />
            <Card label="Conversão em pagamento" value={formatPct(data.summary.paid_conversion)} />
            <Card label="Concluíram" value={data.summary.completed} />
            <Card label="Trials" value={data.summary.trials} />
            <Card label="Assinaturas" value={data.summary.subscribed} />
            <Card label="Receita" value={formatCurrency(Number(data.summary.revenue))} />
          </div>

          <section className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-black text-gray-900 mb-3">Funil etapa a etapa</h2>
            <div className="space-y-2">
              {data.steps.map((s) => (
                <div key={s.key} className="grid grid-cols-[160px_1fr_120px] items-center gap-3 text-sm">
                  <span className="font-bold text-gray-700 truncate">{s.label}</span>
                  <div className="h-6 rounded bg-gray-100 overflow-hidden">
                    <div className="h-full bg-slate-900" style={{ width: `${Math.max(1, s.pct_of_total * 100)}%` }} />
                  </div>
                  <span className="text-right text-gray-600">
                    {s.count} · {formatPct(s.pct_of_total)}
                    {s.drop_from_previous != null && <span className="block text-xs text-red-600">-{formatPct(s.drop_from_previous)}</span>}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
            <h2 className="font-black text-gray-900 mb-3">Comparação A/B</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500"><tr>
                <th className="py-2">Variante</th><th>Peso</th><th>Sessões</th><th>Cadastros</th><th>Pagos</th>
                <th>Conversão</th><th>Receita/sessão</th><th>Confiança</th>
              </tr></thead>
              <tbody>
                {data.variants.map((v) => (
                  <tr key={v.variant_id} className="border-t">
                    <td className="py-2 font-bold">{v.name}{v.is_control && <span className="ml-2 text-xs text-gray-500">(controle)</span>}</td>
                    <td>{v.weight}</td><td>{v.sessions}</td><td>{v.registered}</td><td>{v.paid}</td>
                    <td>{formatPct(v.conversion)}</td><td>{formatCurrency(Number(v.revenue_per_session))}</td>
                    <td>{v.is_control ? '—' : v.low_sample ? <span className="text-amber-700">amostra pequena</span> : formatPct(v.confidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
            <h2 className="font-black text-gray-900 mb-3">Por origem</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500"><tr>
                <th className="py-2">Origem</th><th>Campanha</th><th>Sessões</th><th>Cadastros</th><th>Pagos</th><th>Conversão</th>
              </tr></thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={`${s.utm_source}-${s.utm_campaign}`} className="border-t">
                    <td className="py-2">{s.utm_source || 'direto / sem origem'}</td><td>{s.utm_campaign || '—'}</td>
                    <td>{s.sessions}</td><td>{s.registered}</td><td>{s.paid}</td><td>{formatPct(s.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-black text-gray-900 mb-3">Sessões e pagamentos por dia</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" name="Sessões" stroke="#0f172a" dot={false} />
                  <Line type="monotone" dataKey="paid" name="Pagamentos" stroke="#16a34a" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

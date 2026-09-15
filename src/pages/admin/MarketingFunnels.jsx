import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { Loader2, TrendingUp, Users } from 'lucide-react';
import { getMarketingFunnelLeads, getMarketingFunnelSummary } from '../../lib/marketingFunnelApi';
import { formatDate } from '../../lib/utils';

const FUNNEL_LABELS = { A: 'Funil A — Diagnóstico', B: 'Funil B — Dia do mercado' };

export default function MarketingFunnels() {
  const [summary, setSummary] = useState([]);
  const [leads, setLeads] = useState([]);
  const [variantFilter, setVariantFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [summaryRes, leadsRes] = await Promise.all([
          getMarketingFunnelSummary(),
          getMarketingFunnelLeads(variantFilter || undefined),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setLeads(leadsRes.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [variantFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-yellow" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-black text-gray-950">Funis A/B</h1>
      <p className="mt-1 text-sm text-gray-500">Conversão por etapa e leads capturados em /funil-a e /funil-b.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {summary.map((funnel) => (
          <div key={funnel.funnel_variant} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-950">
                {FUNNEL_LABELS[funnel.funnel_variant] || funnel.funnel_variant}
              </h2>
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Users size={14} /> {funnel.lead_count} leads
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-brand-green">
              <TrendingUp size={14} /> {funnel.lead_to_cta_rate}% dos leads clicaram no CTA
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel.steps} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value, _name, props) => [
                      `${value} visitantes (${props.payload.drop_off_pct}% de queda)`,
                      props.payload.label,
                    ]}
                  />
                  <Bar dataKey="count" fill="#FACC15" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-950">Leads capturados</h2>
          <select
            value={variantFilter}
            onChange={(e) => setVariantFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos os funis</option>
            <option value="A">Funil A</option>
            <option value="B">Funil B</option>
          </select>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Funil</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Nenhum lead capturado ainda.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone || lead.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {FUNNEL_LABELS[lead.funnel_variant] || lead.funnel_variant}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.control_score ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(lead.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

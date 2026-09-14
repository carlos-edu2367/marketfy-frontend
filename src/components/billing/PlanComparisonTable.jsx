import { formatCurrency } from '../../lib/utils';
import { formatFiscalLimit, formatPlanLimit, getCycle, getCycleTotal } from '../../lib/pricing';

export default function PlanComparisonTable({ plans, cycleKey }) {
  const cycle = getCycle(cycleKey);
  const rows = [
    { label: 'Lojas', render: (plan) => formatPlanLimit(plan.max_markets, 'lojas') },
    { label: 'Caixas', render: (plan) => formatPlanLimit(plan.max_terminals, 'caixas') },
    { label: 'NFC-e', render: (plan) => formatFiscalLimit(plan.fiscal_monthly_limit) },
    { label: `Valor (${cycle.label.toLowerCase()})`, render: (plan) => formatCurrency(getCycleTotal(plan, cycleKey)) },
  ];

  return (
    <div className="mt-12 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">Comparar planos</caption>
        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">Recurso</th>
            {plans.map((plan) => (
              <th key={plan.id} scope="col" className="px-4 py-3 text-gray-900">{plan.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-100">
              <th scope="row" className="px-4 py-3 font-bold text-gray-700">{row.label}</th>
              {plans.map((plan) => (
                <td key={plan.id} className="px-4 py-3 text-gray-600">{row.render(plan)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

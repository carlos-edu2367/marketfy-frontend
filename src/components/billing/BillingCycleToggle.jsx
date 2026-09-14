import { BILLING_CYCLES } from '../../lib/pricing';

/**
 * Seletor de ciclo de cobranca compartilhado entre a landing e a tela de
 * planos, para que o rotulo e o comportamento nunca divirjam entre as duas.
 *
 * `theme="dark"` para fundos escuros (landing), `theme="light"` (padrao)
 * para fundos claros (/plans).
 */
export default function BillingCycleToggle({ value, onChange, theme = 'light', className = '' }) {
  const isDark = theme === 'dark';
  const wrap = isDark
    ? 'border-slate-700 bg-slate-800'
    : 'border-gray-200 bg-white shadow-sm';
  const active = isDark
    ? 'bg-brand-yellow text-slate-900 shadow-lg'
    : 'bg-gray-950 text-white shadow-md';
  const inactive = isDark
    ? 'text-slate-400 hover:text-white'
    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900';

  return (
    <div
      role="group"
      aria-label="Período de cobrança"
      className={`inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border p-1.5 ${wrap} ${className}`}
    >
      {BILLING_CYCLES.map((cycle) => (
        <button
          key={cycle.key}
          type="button"
          aria-pressed={value === cycle.key}
          onClick={() => onChange(cycle.key)}
          className={`min-w-[104px] rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:min-w-[124px] ${
            value === cycle.key ? active : inactive
          }`}
        >
          {cycle.label}
        </button>
      ))}
    </div>
  );
}

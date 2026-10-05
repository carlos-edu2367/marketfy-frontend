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
    ? 'border-white/25 bg-white/5'
    : 'border-brand-ink bg-white shadow-sticker';
  const active = isDark
    ? 'bg-brand-yellow text-brand-ink'
    : 'bg-brand-ink text-brand-yellow';
  const inactive = isDark
    ? 'text-white/60 hover:text-white'
    : 'text-gray-500 hover:bg-brand-yellowSoft hover:text-brand-ink';

  return (
    <div
      role="group"
      aria-label="Período de cobrança"
      className={`inline-flex max-w-full items-center justify-center gap-1 rounded-2xl border-2 p-1.5 ${wrap} ${className}`}
    >
      {BILLING_CYCLES.map((cycle) => (
        <button
          key={cycle.key}
          type="button"
          aria-pressed={value === cycle.key}
          onClick={() => onChange(cycle.key)}
          className={`min-w-0 flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-all sm:min-w-[124px] sm:flex-none sm:px-4 ${
            value === cycle.key ? active : inactive
          }`}
        >
          {cycle.label}
        </button>
      ))}
    </div>
  );
}

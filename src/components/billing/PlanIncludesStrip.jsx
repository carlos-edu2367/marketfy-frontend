import { Check } from 'lucide-react';

const INCLUDED = ['PDV offline e gestão em um só lugar', 'Suporte incluído', 'Sem fidelidade'];

/** O que vale para todo plano pago, mostrado uma vez em vez de repetido em cada card. */
export default function PlanIncludesStrip({ theme = 'light' }) {
  const isDark = theme === 'dark';
  return (
    <section
      aria-label="Incluído em todos os planos"
      className={`mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}
    >
      <span className={`font-bold ${isDark ? 'text-brand-yellow' : 'text-brand-ink'}`}>Todos os planos incluem:</span>
      {INCLUDED.map((item) => (
        <span key={item} className="flex items-center gap-1.5">
          <Check size={16} strokeWidth={3} className="shrink-0 text-brand-green" /> {item}
        </span>
      ))}
    </section>
  );
}

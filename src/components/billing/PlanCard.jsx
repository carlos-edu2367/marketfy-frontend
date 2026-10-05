import { Link } from 'react-router-dom';
import { ArrowRight, ReceiptText, ShieldCheck, Store } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import {
  formatFiscalLimit,
  formatPlanLimit,
  getCycle,
  getCycleTotal,
  getMonthlyEquivalent,
  formatCycleSavings,
} from '../../lib/pricing';

/**
 * Card de plano compartilhado entre a landing e a tela de planos, para que a
 * apresentacao (preco, limites, destaque) nunca divirja entre as duas.
 *
 * Todos os numeros vem do plano retornado pela API (GET /identity/plans);
 * nada aqui e um valor fixo no codigo. O que vale para todos os planos
 * (PDV offline, suporte, sem fidelidade) fica em PlanIncludesStrip, mostrado
 * uma vez por pagina em vez de repetido em cada card.
 */
export default function PlanCard({
  plan,
  cycleKey,
  highlighted = false,
  badgeLabel = null,
  ctaLabel = 'Escolher plano',
  ctaTo,
  onCtaClick,
  isLoading = false,
  theme = 'light',
}) {
  const cycle = getCycle(cycleKey);
  const total = getCycleTotal(plan, cycleKey);
  const monthlyEquivalent = getMonthlyEquivalent(plan, cycleKey);
  const savingsLabel = formatCycleSavings(plan, cycleKey);
  const isDark = theme === 'dark';

  const surface = isDark
    ? (highlighted
      ? 'bg-brand-yellow text-brand-ink border-white shadow-[8px_8px_0_0_#FFFFFF]'
      : 'bg-white/[0.04] border-white/25 text-white hover:border-brand-yellow')
    : (highlighted
      ? 'bg-brand-yellow border-brand-ink shadow-sticker-lg'
      : 'bg-white border-brand-ink shadow-sticker');

  const mutedText = isDark ? (highlighted ? 'text-brand-ink/70' : 'text-white/55') : (highlighted ? 'text-brand-ink/70' : 'text-gray-500');
  const headingText = isDark ? (highlighted ? 'text-brand-ink' : 'text-white') : 'text-brand-ink';
  const limitBg = isDark
    ? (highlighted ? 'bg-white/70 border-brand-ink/20' : 'bg-white/5 border-white/15')
    : (highlighted ? 'bg-white/70 border-brand-ink/20' : 'bg-gray-50 border-gray-100');
  const limitText = isDark ? (highlighted ? 'text-brand-ink' : 'text-white/85') : 'text-gray-700';
  const limitIcon = highlighted ? 'text-brand-ink' : (isDark ? 'text-brand-yellow' : 'text-brand-ink');

  return (
    <article
      className={`relative flex h-full w-full max-w-[380px] flex-col rounded-[28px] border-2 p-6 transition-all hover:-translate-y-1 ${surface}`}
    >
      {badgeLabel && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-brand-ink bg-brand-ink px-4 py-1 text-[11px] font-black uppercase tracking-wider text-brand-yellow">
          {badgeLabel}
        </div>
      )}

      <div className={`mb-5 border-b pb-5 ${isDark ? (highlighted ? 'border-brand-ink/25' : 'border-white/15') : (highlighted ? 'border-brand-ink/25' : 'border-gray-100')}`}>
        <h3 className={`font-display text-2xl font-black tracking-tight ${headingText}`}>{plan.name}</h3>
        {plan.description && (
          <p className={`mt-2 text-sm leading-6 ${mutedText}`}>{plan.description}</p>
        )}

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className={`text-sm font-medium opacity-60 ${headingText}`}>R$</span>
          <span className={`font-display text-4xl font-black tracking-tight ${headingText}`}>
            {monthlyEquivalent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-bold opacity-60 ${headingText}`}>/mes</span>
        </div>
        {cycle.key === 'monthly' ? (
          <p className={`mt-1 text-xs font-medium ${mutedText}`}>Cobrado mensalmente.</p>
        ) : (
          <p className={`mt-1 text-xs font-medium ${mutedText}`}>
            {formatCurrency(total)} cobrados {cycle.key === 'semiannual' ? 'a cada 6 meses' : 'uma vez por ano'}
            {savingsLabel ? <span className="font-bold text-emerald-500"> · {savingsLabel}</span> : null}
          </p>
        )}
      </div>

      <div className="mb-5 space-y-2">
        <p className={`text-xs font-bold uppercase tracking-[0.14em] ${mutedText}`}>Limites do plano</p>
        <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${limitBg}`}>
          <Store size={17} className={`mt-0.5 shrink-0 ${limitIcon}`} />
          <span className={`text-sm leading-5 ${limitText}`}>{formatPlanLimit(plan.max_markets, 'lojas')}</span>
        </div>
        <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${limitBg}`}>
          <ShieldCheck size={17} className={`mt-0.5 shrink-0 ${limitIcon}`} />
          <span className={`text-sm leading-5 ${limitText}`}>{formatPlanLimit(plan.max_terminals, 'caixas')}</span>
        </div>
        <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${limitBg}`}>
          <ReceiptText size={17} className={`mt-0.5 shrink-0 ${limitIcon}`} />
          <span className={`text-sm leading-5 ${limitText}`}>{formatFiscalLimit(plan.fiscal_monthly_limit)}</span>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <Button
          as={ctaTo ? Link : 'button'}
          to={ctaTo}
          type={ctaTo ? undefined : 'button'}
          onClick={onCtaClick}
          isLoading={isLoading}
          variant={highlighted ? 'ink' : (isDark ? undefined : 'brand')}
          className={`h-12 w-full font-bold ${
            isDark && !highlighted ? 'border-2 border-white/30 bg-transparent text-white hover:border-brand-yellow hover:text-brand-yellow' : ''
          } rounded-xl`}
        >
          {ctaLabel} <ArrowRight size={18} />
        </Button>
      </div>
    </article>
  );
}

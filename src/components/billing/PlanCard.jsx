import { Link } from 'react-router-dom';
import { ArrowRight, Check, ReceiptText, ShieldCheck, Store } from 'lucide-react';
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
 * nada aqui e um valor fixo no codigo.
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
      ? 'bg-white text-slate-900 border-brand-yellow ring-4 ring-brand-yellow/25 shadow-2xl'
      : 'bg-slate-800/60 border-slate-700 text-white backdrop-blur-sm hover:bg-slate-800')
    : (highlighted
      ? 'bg-white border-gray-950 shadow-lg shadow-gray-200/70'
      : 'bg-white border-gray-200 shadow-sm');

  const mutedText = isDark ? (highlighted ? 'text-gray-500' : 'text-slate-400') : 'text-gray-500';
  const headingText = isDark ? (highlighted ? 'text-gray-950' : 'text-gray-50') : 'text-gray-950';
  const limitBg = isDark
    ? (highlighted ? 'bg-gray-50 border-gray-100' : 'bg-slate-900/60 border-slate-700')
    : 'bg-gray-50/80 border-gray-100';
  const limitText = isDark ? (highlighted ? 'text-gray-700' : 'text-slate-200') : 'text-gray-700';
  const limitIcon = isDark
    ? (highlighted ? 'text-brand-yellow' : 'text-brand-yellow')
    : 'text-brand-yellow';

  return (
    <article
      className={`relative flex h-full w-full max-w-[380px] flex-col rounded-3xl border p-6 transition-all hover:-translate-y-1 ${surface}`}
    >
      {badgeLabel && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-yellow px-4 py-1 text-[11px] font-black uppercase tracking-wider text-brand-dark shadow-lg">
          {badgeLabel}
        </div>
      )}

      <div className={`mb-5 border-b pb-5 ${isDark ? (highlighted ? 'border-gray-200/60' : 'border-slate-700') : 'border-gray-100'}`}>
        <h3 className={`text-2xl font-black tracking-tight ${headingText}`}>{plan.name}</h3>
        <p className={`mt-2 min-h-[40px] text-sm leading-6 ${mutedText}`}>
          {plan.description || 'Para negocios que querem vender com mais organizacao.'}
        </p>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className={`text-sm font-medium opacity-60 ${headingText}`}>R$</span>
          <span className={`text-4xl font-black tracking-tight ${headingText}`}>
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

      <div className={`mb-5 space-y-2 text-sm ${isDark ? (highlighted ? 'text-gray-600' : 'text-slate-300') : 'text-gray-600'}`}>
        <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500 shrink-0" /> PDV offline e gestao em um so lugar</div>
        <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500 shrink-0" /> Suporte incluido</div>
        <div className="flex items-center gap-2"><Check size={16} className="text-emerald-500 shrink-0" /> Sem fidelidade</div>
      </div>

      <div className="mt-auto pt-2">
        <Button
          as={ctaTo ? Link : 'button'}
          to={ctaTo}
          type={ctaTo ? undefined : 'button'}
          onClick={ctaTo ? undefined : onCtaClick}
          isLoading={isLoading}
          variant={highlighted ? 'primary' : (isDark ? undefined : 'secondary')}
          className={`h-12 w-full font-bold ${
            isDark && !highlighted ? 'border border-slate-600 bg-slate-700 text-white hover:bg-slate-600' : ''
          } ${!isDark && !highlighted ? 'border-2 border-gray-100 hover:border-brand-yellow hover:bg-yellow-50' : ''}`}
        >
          {ctaLabel} <ArrowRight size={18} />
        </Button>
      </div>
    </article>
  );
}

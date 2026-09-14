import { formatCurrency } from './utils';

/**
 * Ciclos de cobranca suportados pela API de planos (Plan.price_monthly /
 * price_180days / price_annual). O valor de cada ciclo no backend e o TOTAL
 * cobrado no periodo, nao um valor mensal.
 */
export const BILLING_CYCLES = [
  { key: 'monthly', days: 30, months: 1, label: 'Mensal', suffix: '/mes' },
  { key: 'semiannual', days: 180, months: 6, label: 'Semestral', suffix: '/semestre' },
  { key: 'annual', days: 365, months: 12, label: 'Anual', suffix: '/ano' },
];

export function getCycle(key) {
  return BILLING_CYCLES.find((cycle) => cycle.key === key) || BILLING_CYCLES[0];
}

export function getCycleByDuration(days) {
  return BILLING_CYCLES.find((cycle) => cycle.days === days) || BILLING_CYCLES[0];
}

/**
 * Retorna o preco TOTAL do ciclo para o plano (o valor que sera cobrado).
 */
export function getCycleTotal(plan, cycleKey) {
  if (!plan) return 0;
  if (cycleKey === 'semiannual') return Number(plan.price_180days || 0);
  if (cycleKey === 'annual') return Number(plan.price_annual || 0);
  return Number(plan.price_monthly || 0);
}

/**
 * Equivalente mensal de um ciclo: o total do periodo dividido pelo numero de
 * meses do ciclo. Serve para comparar planos de ciclos diferentes lado a lado.
 */
export function getMonthlyEquivalent(plan, cycleKey) {
  const cycle = getCycle(cycleKey);
  const total = getCycleTotal(plan, cycleKey);
  if (!total || !cycle.months) return 0;
  return total / cycle.months;
}

/**
 * Economia em reais (por ano) de contratar o ciclo informado em vez de pagar
 * o valor mensal todo mes durante o mesmo periodo. Retorna null quando nao ha
 * economia a mostrar (ciclo mensal, ou dados insuficientes).
 */
export function getCycleSavings(plan, cycleKey) {
  if (cycleKey === 'monthly' || !plan) return null;
  const cycle = getCycle(cycleKey);
  const monthlyTotalOverPeriod = Number(plan.price_monthly || 0) * cycle.months;
  const cycleTotal = getCycleTotal(plan, cycleKey);
  if (!monthlyTotalOverPeriod || !cycleTotal) return null;
  const diff = monthlyTotalOverPeriod - cycleTotal;
  if (diff <= 0) return null;
  return diff;
}

export function formatCycleSavings(plan, cycleKey) {
  const savings = getCycleSavings(plan, cycleKey);
  if (savings === null) return null;
  return `Economize ${formatCurrency(savings)} no periodo`;
}

/**
 * Formata um limite numerico do plano (lojas, caixas). O backend usa 0 para
 * indicar que o limite nao esta disponivel no plano (Plan.is_limit_reached
 * bloqueia imediatamente quando o contador atual >= limite), entao 0 e
 * tratado como "nao incluido", nunca como "ilimitado".
 */
export function formatPlanLimit(value, unitLabel) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return `${unitLabel} não incluídas no plano`;
  return `Até ${numericValue} ${unitLabel}`;
}

export function formatFiscalLimit(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 'Emissões fiscais não incluídas';
  return `${numericValue.toLocaleString('pt-BR')} emissões fiscais por mês`;
}

/**
 * Ordena e filtra os planos publicos e vendaveis retornados por
 * GET /identity/plans (planos ativos do tipo "pago"), do mais barato ao mais
 * caro pelo preco mensal.
 */
export function selectPublicPlans(plans) {
  if (!Array.isArray(plans)) return [];
  return plans
    .filter((plan) => plan.is_active && plan.type === 'pago')
    .sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));
}

export function selectTrialPlan(plans) {
  if (!Array.isArray(plans)) return null;
  return plans.find((plan) => plan.is_active && plan.type === 'trial') || null;
}

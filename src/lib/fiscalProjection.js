const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Projeta quando os creditos fiscais do periodo acabam, a partir do ritmo de
 * consumo do proprio mes (used_count / dias iniciados). A API de saldo so
 * expoe o acumulado do periodo, entao nao ha sazonalidade semanal aqui.
 */
export function projectCreditsRunway({ period, usedCount, remaining, now = new Date() }) {
  const match = /^(\d{4})(\d{2})$/.exec(String(period ?? ''));
  if (!match) return null;

  const periodStart = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const periodEnd = new Date(Number(match[1]), Number(match[2]), 1);
  if (now < periodStart || now >= periodEnd) return null;

  const used = Math.max(0, Number(usedCount) || 0);
  const left = Math.max(0, Number(remaining) || 0);
  const daysElapsed = Math.max(1, Math.ceil((now - periodStart) / MS_PER_DAY));
  const daysUntilPeriodEnd = Math.ceil((periodEnd - now) / MS_PER_DAY);

  if (used === 0) {
    return { dailyRate: 0, daysLeft: null, daysUntilPeriodEnd, runsOutBeforePeriodEnd: false };
  }

  const dailyRate = used / daysElapsed;
  const daysLeft = Math.floor(left / dailyRate);
  return { dailyRate, daysLeft, daysUntilPeriodEnd, runsOutBeforePeriodEnd: daysLeft < daysUntilPeriodEnd };
}

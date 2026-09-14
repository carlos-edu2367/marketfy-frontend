import { AlertTriangle } from 'lucide-react';
import { projectCreditsRunway } from '../../lib/fiscalProjection';

export default function CreditsRunwayNotice({ period, usedCount, remaining, now }) {
  const projection = projectCreditsRunway({ period, usedCount, remaining, now });
  if (!projection?.runsOutBeforePeriodEnd) return null;

  const { daysLeft } = projection;
  const when = daysLeft === 0
    ? 'No ritmo atual, seus créditos acabam hoje.'
    : `No ritmo atual, seus créditos acabam em cerca de ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}, antes do fim do mês.`;

  return (
    <p
      role="status"
      className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{when} Compre um pacote abaixo para não interromper a emissão de NFC-e.</span>
    </p>
  );
}

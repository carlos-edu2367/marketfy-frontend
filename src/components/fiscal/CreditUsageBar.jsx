import { AlertTriangle, CircleDollarSign } from 'lucide-react';

function toNumber(value) {
  return Number(value || 0);
}

function formatPeriod(period) {
  if (!period || period.length !== 6) return period || '';
  const date = new Date(Number(period.slice(0, 4)), Number(period.slice(4, 6)) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function CreditUsageBar({
  used = 0,
  includedLimit = 0,
  addonLimit = 0,
  addonTotal = 0,
  period,
}) {
  const usedCount = toNumber(used);
  const included = toNumber(includedLimit);
  const addon = toNumber(addonLimit);
  const addonTotalVal = toNumber(addonTotal);
  const includedUsed = Math.min(usedCount, included);
  const includedPercent = included > 0 ? Math.min(100, (includedUsed / included) * 100) : 0;
  const displayPercent = included > 0 ? (includedUsed / included) * 100 : 0;
  const critical = displayPercent >= 100;
  const warning = displayPercent >= 80 && !critical;
  const addonRemaining = addon;
  const addonPercent = addonTotalVal > 0
    ? Math.min(100, (addonRemaining / addonTotalVal) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Periodo</p>
          <p className="text-sm font-bold capitalize text-gray-700">{formatPeriod(period)}</p>
        </div>
        {critical && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700">
            <AlertTriangle size={14} />
            Limite atingido
          </span>
        )}
        {warning && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs font-black text-yellow-800">
            <AlertTriangle size={14} />
            Voce usou {displayPercent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% das emissoes do mes
          </span>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-gray-700">Emissoes incluidas no plano</span>
          <span className="font-mono text-xs font-black text-gray-600">
            {includedUsed}/{included}
            <span className="ml-2 text-gray-400">
              {displayPercent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${includedPercent}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 font-bold text-gray-700">
            <CircleDollarSign size={16} className="text-green-600" />
            Creditos extras
          </span>
          <span className="font-mono text-xs font-black text-gray-600">
            {addonRemaining} restantes
            {addonTotalVal > 0 && (
              <span className="ml-1 text-gray-400">/ {addonTotalVal} comprados</span>
            )}
          </span>
        </div>
        {addonTotalVal > 0 ? (
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${addonPercent}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Nenhum pacote ativo. Compre abaixo para ter emissoes extras.
          </p>
        )}
      </div>
    </div>
  );
}

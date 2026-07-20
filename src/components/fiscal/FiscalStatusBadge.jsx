const STATUSES = {
  configured: ['Configurado', 'text-green-700 bg-green-50 border-green-200'],
  missing: ['Pendente', 'text-amber-700 bg-amber-50 border-amber-200'],
  draft: ['Rascunho', 'text-sky-700 bg-sky-50 border-sky-200'],
  expired: ['Vencida', 'text-red-700 bg-red-50 border-red-200'],
  context_mismatch: ['Contexto divergente', 'text-red-700 bg-red-50 border-red-200'],
  legacy_only: ['Somente legado', 'text-violet-700 bg-violet-50 border-violet-200'],
  not_yet_effective: ['Ainda não vigente', 'text-amber-700 bg-amber-50 border-amber-200'],
  ambiguous: ['Ambígua', 'text-red-700 bg-red-50 border-red-200'],
};

export default function FiscalStatusBadge({ status }) {
  const [label, color] = STATUSES[status] || STATUSES.missing;
  const safeStatus = STATUSES[status] ? status : 'missing';

  return (
    <span
      data-testid={`fiscal-status-${safeStatus}`}
      className={`rounded-full border px-2 py-1 text-xs font-black ${color}`}
    >
      {label}
    </span>
  );
}

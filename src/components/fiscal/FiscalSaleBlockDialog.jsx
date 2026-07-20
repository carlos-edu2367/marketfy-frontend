import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const RECOVERY_ROLES = new Set(['owner', 'manager']);

function productLabel(item, index) {
  return item?.product_name || item?.name || item?.product_id || `Item ${index + 1}`;
}

export default function FiscalSaleBlockDialog({ error, marketId, role, onClose }) {
  const items = Array.isArray(error?.items) ? error.items : [];
  const visibleItems = items.slice(0, 5);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const canRecover = RECOVERY_ROLES.has(String(role || '').toLowerCase());
  const isConnectionError = error?.code === 'sale.fiscal_connection_required';
  const fiscalUrl = `/dashboard/settings?tab=fiscal&marketId=${marketId}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-labelledby="fiscal-sale-block-title">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3 text-amber-700">
          <AlertTriangle className="mt-0.5 shrink-0" size={28} />
          <div>
            <h2 id="fiscal-sale-block-title" className="text-xl font-black text-slate-900">Configuração fiscal pendente</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isConnectionError
                ? 'Esta venda exige validação fiscal online antes de ser concluída.'
                : 'Esta venda não foi concluída. Corrija a pendência fiscal e tente novamente.'}
            </p>
          </div>
        </div>

        {visibleItems.length > 0 && (
          <ul className="mb-4 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            {visibleItems.map((item, index) => <li key={`${productLabel(item, index)}-${index}`}>{productLabel(item, index)}</li>)}
            {hiddenCount > 0 && <li className="font-semibold text-slate-500">… e mais {hiddenCount} produto{hiddenCount === 1 ? '' : 's'}.</li>}
          </ul>
        )}

        {canRecover ? (
          <Link to={fiscalUrl} className="mb-3 flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
            Abrir Central Fiscal
          </Link>
        ) : (
          <p className="mb-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Chame o responsável para corrigir a configuração fiscal.</p>
        )}
        <button type="button" onClick={onClose} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Voltar ao pagamento</button>
      </div>
    </div>
  );
}

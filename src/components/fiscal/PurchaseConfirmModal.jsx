import { AlertTriangle, Loader2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';

export default function PurchaseConfirmModal({ packageItem, loading = false, checkoutPhase = null, error = null, onCancel, onConfirm }) {
  if (!packageItem) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-confirm-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="purchase-confirm-title" className="text-lg font-black text-gray-900">Confirmar compra</h2>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onCancel}
            aria-label="Fechar"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-bold text-gray-500">Pacote</dt>
            <dd className="font-black text-gray-900">{packageItem.emission_count} emissoes extras</dd>
            <dt className="font-bold text-gray-500">Valor total</dt>
            <dd className="font-black text-gray-900">
              {formatCurrency(Number(packageItem.price_net_target))}
              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                Com taxas: {formatCurrency(Number(packageItem.price_gross))}
              </span>
            </dd>
          </dl>

          {error && (
            <div role="alert" className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
              <p>{error.message || error}</p>
            </div>
          )}

          <div className="flex gap-3 rounded-xl border border-yellow-100 bg-yellow-50 p-4 text-sm text-yellow-900">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <p>
              Voce sera redirecionado para o checkout seguro do Asaas. La, o comprador informa
              CPF/CNPJ, nome e e-mail para concluir o pagamento. Os creditos serao ativados
              automaticamente apos a confirmacao.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button className="flex-1 font-black animate-transition" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin mr-1.5" /> : null}
            {checkoutPhase === 'processing' ? 'Criando checkout...' :
             checkoutPhase === 'waiting_gateway' ? 'Preparando checkout seguro...' :
             'Ir para pagamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}

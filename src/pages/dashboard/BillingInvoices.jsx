import { useEffect, useState } from 'react';
import { getInvoices, requestInvoiceCheckout, retryInvoice } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

const STATUS_LABEL = {
  pending: { text: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
  paid: { text: 'Paga', cls: 'bg-green-100 text-green-800' },
  overdue: { text: 'Vencida', cls: 'bg-red-100 text-red-800' },
  canceled: { text: 'Cancelada', cls: 'bg-gray-100 text-gray-600' },
};

export default function BillingInvoices() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const load = async () => {
    try {
      const { data } = await getInvoices();
      setItems(data.items || []);
    } catch {
      toast.error('Erro ao carregar faturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePay = async (invoice) => {
    try {
      setPaying(invoice.invoice_id);
      const { data } = await requestInvoiceCheckout(invoice.invoice_id);
      let url = data.checkout_url;

      // O checkout é assíncrono no Billing Core. Repetir esse endpoint só
      // consulta o job existente depois da primeira criação; não cobra de novo.
      for (let attempt = 0; !url && attempt < 10; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await requestInvoiceCheckout(invoice.invoice_id);
        url = response.data.checkout_url;
      }

      if (url) { window.location.href = url; return; }
      toast.error('Link de pagamento ainda não disponível. Tente novamente em instantes.');
    } catch {
      toast.error('Erro ao abrir o pagamento.');
    } finally {
      setPaying(null);
    }
  };

  const handleRetry = async (invoice) => {
    try {
      setRetrying(invoice.invoice_id);
      await retryInvoice(invoice.invoice_id);
      toast.success('Nova fatura criada. Clique em Pagar para continuar.');
      await load();
    } catch {
      toast.error('Não foi possível criar uma nova fatura. Tente novamente.');
    } finally {
      setRetrying(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-yellow" size={36} /></div>;

  if (!items.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText size={40} className="mx-auto mb-3 opacity-40" />
        Nenhuma fatura encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-black text-gray-900 mb-4">Minhas Faturas</h2>
      {items.map((inv) => {
        const badge = STATUS_LABEL[inv.status] || STATUS_LABEL.pending;
        return (
          <div key={inv.invoice_id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
            <div>
              <p className="font-bold text-gray-900">{formatCurrency(Number(inv.amount))}</p>
              <p className="text-xs text-gray-500">
                Vencimento: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('pt-BR') : '—'}
              </p>
              <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
            </div>
            {inv.status === 'pending' && (
              <Button onClick={() => handlePay(inv)} isLoading={paying === inv.invoice_id} className="font-bold">
                Pagar
              </Button>
            )}
            {inv.status === 'canceled' && (
              <Button onClick={() => handleRetry(inv)} isLoading={retrying === inv.invoice_id} className="font-bold">
                Tentar novamente
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

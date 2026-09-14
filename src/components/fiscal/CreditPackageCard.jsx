import { Check, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';

function packageTitle(packageItem) {
  return `${packageItem.emission_count} emissões extras`;
}

function pricePerEmission(packageItem) {
  const count = Number(packageItem.emission_count);
  const total = Number(packageItem.price_gross);
  if (!count || !total) return null;
  return total / count;
}

export default function CreditPackageCard({ packageItem, onPurchase, loading = false, highlight = false }) {
  const title = packageTitle(packageItem);
  const unitPrice = pricePerEmission(packageItem);

  return (
    <article
      aria-label={title}
      className={`relative flex min-h-[280px] flex-col rounded-xl border bg-white p-5 shadow-sm transition-all ${
        highlight ? 'border-brand-yellow ring-2 ring-brand-yellow/20' : 'border-gray-200'
      }`}
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
        <CreditCard size={22} />
      </div>

      <h3 className="text-xl font-black text-gray-900">{title}</h3>
      <div className="mt-4 space-y-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-gray-400">Valor cobrado</span>
          <p className="text-3xl font-black text-gray-950">
            {formatCurrency(Number(packageItem.price_gross))}
          </p>
        </div>
        {unitPrice !== null && (
          <p className="text-xs font-medium text-gray-500">
            <span className="font-bold text-gray-700">{formatCurrency(unitPrice)}</span> por emissão
          </p>
        )}
      </div>

      <ul className="mt-5 space-y-2 text-sm font-medium text-gray-600">
        <li className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Válido por 12 meses</li>
        <li className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Não expira no fim do mês</li>
        <li className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Compartilhado entre lojas</li>
      </ul>

      <Button
        className="mt-auto w-full font-black"
        disabled={loading}
        onClick={() => onPurchase(packageItem)}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        Comprar pacote
      </Button>
    </article>
  );
}

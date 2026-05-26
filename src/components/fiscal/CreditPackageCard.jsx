import { Check, CreditCard, Loader2, Star } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';

function packageTitle(packageItem) {
  return `${packageItem.emission_count} emissoes extras`;
}

export default function CreditPackageCard({ packageItem, onPurchase, loading = false }) {
  const popular = packageItem.slug === 'pack_250';
  const title = packageTitle(packageItem);

  return (
    <article
      aria-label={title}
      className={`relative flex min-h-[280px] flex-col rounded-xl border bg-white p-5 shadow-sm transition-all ${
        popular ? 'border-brand-yellow ring-2 ring-brand-yellow/20' : 'border-gray-200'
      }`}
    >
      {popular && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">
          <Star size={12} className="text-brand-yellow" />
          Mais popular
        </span>
      )}

      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
        <CreditCard size={22} />
      </div>

      <h3 className="pr-24 text-xl font-black text-gray-900">{title}</h3>
      <div className="mt-4 space-y-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-gray-400">Valor total</span>
          <p className="text-3xl font-black text-gray-950">
            {formatCurrency(Number(packageItem.price_net_target))}
          </p>
        </div>
        <p className="text-xs font-medium text-gray-500">
          Com taxas: <span className="font-bold text-gray-700">{formatCurrency(Number(packageItem.price_gross))}</span>
        </p>
      </div>

      <ul className="mt-5 space-y-2 text-sm font-medium text-gray-600">
        <li className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Valido por 12 meses</li>
        <li className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Nao expira no mes</li>
        <li className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Compartilhado entre lojas</li>
      </ul>

      <Button
        className="mt-auto w-full font-black"
        disabled={loading}
        onClick={() => onPurchase(packageItem)}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        Comprar com Mercado Pago
      </Button>
    </article>
  );
}


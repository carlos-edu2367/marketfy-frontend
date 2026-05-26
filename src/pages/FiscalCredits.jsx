import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Store } from 'lucide-react';
import toast from 'react-hot-toast';

import CreditPackageCard from '../components/fiscal/CreditPackageCard';
import CreditUsageBar from '../components/fiscal/CreditUsageBar';
import PurchaseConfirmModal from '../components/fiscal/PurchaseConfirmModal';
import { Button } from '../components/ui/Button';
import { useFiscalCredits } from '../hooks/useFiscalCredits';
import api, { getApiErrorMessage } from '../lib/api';
import { formatCurrency } from '../lib/utils';

const PACKAGE_LABELS = {
  pack_100: '100 emissoes extras',
  pack_250: '250 emissoes extras',
  pack_500: '500 emissoes extras',
};

const STATUS_LABELS = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Cancelado',
  cancelled: 'Cancelado',
};

function formatDateOnly(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function FiscalCredits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState(searchParams.get('marketId') || '');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const {
    balance,
    packages,
    history,
    loading,
    error,
    page,
    purchaseLoadingSlug,
    fetchAll,
    fetchHistory,
    initiatePurchase,
  } = useFiscalCredits(selectedMarketId);

  useEffect(() => {
    let cancelled = false;
    api.get('/identity/markets')
      .then(({ data }) => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : [];
        setMarkets(items);
        const queryMarket = searchParams.get('marketId');
        const nextMarket = queryMarket || selectedMarketId || items[0]?.id || '';
        if (nextMarket) {
          setSelectedMarketId(nextMarket);
          setSearchParams({ marketId: nextMarket }, { replace: true });
        }
      })
      .catch(() => toast.error('Erro ao carregar lojas.'));
    return () => { cancelled = true; };
  }, [searchParams, selectedMarketId, setSearchParams]);

  const totals = useMemo(() => {
    const included = Number(balance?.included_limit || 0);
    const addon = Number(balance?.addon_limit || 0);
    const used = Number(balance?.used_count || 0);
    return {
      available: included + addon,
      included,
      addon,
      used,
    };
  }, [balance]);

  const handleMarketChange = (event) => {
    const nextMarketId = event.target.value;
    setSelectedMarketId(nextMarketId);
    setSearchParams({ marketId: nextMarketId });
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage) return;
    setConfirming(true);
    try {
      await initiatePurchase(selectedPackage.slug);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Nao foi possivel iniciar o checkout.'));
      setConfirming(false);
    }
  };

  if (!selectedMarketId && markets.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          Nenhuma loja disponivel para creditos fiscais.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Creditos fiscais</h1>
            <p className="mt-1 text-sm text-gray-500">
              Acompanhe o uso mensal de NFC-e e compre pacotes extras para o owner.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {markets.length > 1 && (
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600">
                <Store size={16} />
                <select
                  className="bg-transparent outline-none"
                  value={selectedMarketId}
                  onChange={handleMarketChange}
                >
                  {markets.map(market => (
                    <option key={market.id} value={market.id}>{market.name}</option>
                  ))}
                </select>
              </label>
            )}
            <Button variant="secondary" size="sm" onClick={fetchAll}>
              <RefreshCw size={16} />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            Nao foi possivel carregar os creditos fiscais.
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Resumo do mes</h2>
              <p className="text-sm text-gray-500">
                {totals.used} emissoes usadas de {totals.available} disponiveis
                {' '}({totals.included} incluidas + {totals.addon} extras)
              </p>
            </div>
            <Link
              to={`/pdv/${selectedMarketId}`}
              className="text-sm font-bold text-gray-500 hover:text-gray-900"
            >
              Abrir PDV
            </Link>
          </div>

          {loading && !balance ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : (
            <CreditUsageBar
              used={balance?.used_count || 0}
              includedLimit={balance?.included_limit || 0}
              addonLimit={balance?.addon_limit || 0}
              period={balance?.period}
            />
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">Comprar creditos extras</h2>
            <p className="text-sm text-gray-500">Pacotes pagos via Mercado Pago e ativados por webhook fiscal.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map(packageItem => (
              <CreditPackageCard
                key={packageItem.slug}
                packageItem={packageItem}
                loading={purchaseLoadingSlug === packageItem.slug}
                onPurchase={setSelectedPackage}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Historico de compras</h2>
              <p className="text-sm text-gray-500">Ultimos pacotes comprados pelo owner.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Pacote</th>
                  <th className="px-6 py-3">Qtd</th>
                  <th className="px-6 py-3">Valor</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                      Nenhuma compra registrada.
                    </td>
                  </tr>
                ) : history.map(item => (
                  <tr key={item.package_id}>
                    <td className="px-6 py-4 font-medium text-gray-700">{formatDateOnly(item.created_at)}</td>
                    <td className="px-6 py-4 text-gray-600">{PACKAGE_LABELS[item.package_slug] || item.package_slug}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(Number(item.price_gross || 0))}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">
                        {STATUS_LABELS[item.payment_status] || item.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-xs font-bold text-gray-400">Pagina {page}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => fetchHistory(page - 1)}>
                <ChevronLeft size={16} />
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={history.length < 10} onClick={() => fetchHistory(page + 1)}>
                Proxima
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <PurchaseConfirmModal
        packageItem={selectedPackage}
        loading={confirming || purchaseLoadingSlug === selectedPackage?.slug}
        onCancel={() => setSelectedPackage(null)}
        onConfirm={handleConfirmPurchase}
      />
    </main>
  );
}

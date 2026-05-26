import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Store } from 'lucide-react';
import toast from 'react-hot-toast';

import CreditPackageCard from '../components/fiscal/CreditPackageCard';
import CreditUsageBar from '../components/fiscal/CreditUsageBar';
import CustomQuantityInput from '../components/fiscal/CustomQuantityInput';
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

function packageLabel(slug) {
  if (!slug) return '-';
  if (PACKAGE_LABELS[slug]) return PACKAGE_LABELS[slug];
  if (slug.startsWith('custom_')) {
    const qty = slug.replace('custom_', '');
    return `${qty} emissoes (personalizado)`;
  }
  return slug;
}

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
  const [customPurchaseLoading, setCustomPurchaseLoading] = useState(false);

  const {
    balance,
    packages,
    history,
    loading,
    error,
    page,
    purchaseLoadingSlug,
    config,
    fetchAll,
    fetchHistory,
    initiatePurchase,
    initiateCustomPurchase,
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
    const remaining = Number(balance?.remaining || 0);
    return {
      available: remaining,
      total: included + addon,
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

  const handleCustomPurchase = async (qty) => {
    setCustomPurchaseLoading(true);
    try {
      await initiateCustomPurchase(qty);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Nao foi possivel iniciar o checkout.'));
    } finally {
      setCustomPurchaseLoading(false);
    }
  };

  if (!selectedMarketId && markets.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50/50 p-6 md:p-10 overflow-y-auto">
        <div className="mx-auto max-w-6xl w-full rounded-3xl border border-dashed border-gray-200 bg-white p-16 text-center text-gray-400 shadow-sm flex flex-col items-center justify-center space-y-4">
          <Store size={48} className="text-gray-300 animate-pulse" />
          <p className="font-bold text-lg text-gray-500">Nenhuma loja disponível para créditos fiscais.</p>
          <p className="text-sm text-gray-400 max-w-md">Contate o administrador ou crie uma loja em configurações para gerenciar créditos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 md:p-10 overflow-y-auto custom-scrollbar">
      <div className="mx-auto max-w-6xl w-full space-y-8 pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow/10 px-3 py-1 text-xs font-black text-brand-dark">
                Acompanhamento Fiscal
              </span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Créditos Fiscais</h1>
            <p className="text-sm font-medium text-gray-500 max-w-xl">
              Monitore o uso mensal de NFC-e, consulte o histórico de compras e adquira pacotes extras para sua loja.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {markets.length > 1 && (
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-bold text-gray-700 shadow-sm hover:border-gray-300 transition-colors cursor-pointer">
                <Store size={16} className="text-brand-yellow" />
                <select
                  className="bg-transparent outline-none pr-2 font-bold text-gray-800"
                  value={selectedMarketId}
                  onChange={handleMarketChange}
                >
                  {markets.map(market => (
                    <option key={market.id} value={market.id}>{market.name}</option>
                  ))}
                </select>
              </label>
            )}
            <Button variant="secondary" size="sm" onClick={fetchAll} className="shadow-sm font-bold bg-white border border-gray-200 hover:bg-gray-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>Não foi possível carregar as informações de créditos fiscais. Tente novamente mais tarde.</span>
          </div>
        )}

        {/* Resumo do Mês Card */}
        <section className="rounded-3xl border border-gray-200/80 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <RefreshCw size={180} />
          </div>
          <div className="relative z-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Resumo de Emissões</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  {totals.used} emissões consumidas &mdash; <span className="font-bold text-brand-dark">{totals.available} restantes</span> de {totals.total} no total.
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ({totals.included} incluídas no plano + {totals.addon} extras adquiridas)
                </p>
              </div>
              <Link
                to={`/pdv/${selectedMarketId}`}
                className="text-sm font-bold text-brand-yellow hover:text-yellow-600 transition-colors flex items-center gap-1 bg-brand-yellow/10 px-3.5 py-1.5 rounded-xl font-black"
              >
                Abrir frente de caixa (PDV)
              </Link>
            </div>

            {loading && !balance ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-brand-yellow" size={32} />
              </div>
            ) : (
              <CreditUsageBar
                used={balance?.used_count || 0}
                includedLimit={balance?.included_limit || 0}
                addonLimit={balance?.addon_limit || 0}
                addonTotal={balance?.addon_total || 0}
                period={balance?.period}
              />
            )}
          </div>
        </section>

        {/* Pacotes de Crédito Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">Comprar Créditos Adicionais</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Escolha um pacote de emissões adicionais. Pagamento instantâneo via Mercado Pago e ativação imediata.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {packages.map(packageItem => (
              <CreditPackageCard
                key={packageItem.slug}
                packageItem={packageItem}
                loading={purchaseLoadingSlug === packageItem.slug}
                onPurchase={setSelectedPackage}
              />
            ))}
          </div>
          
          <div className="max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-sm p-1.5">
            <CustomQuantityInput
              loading={customPurchaseLoading}
              onPurchase={handleCustomPurchase}
              minQty={config?.min_qty ?? 1}
              maxQty={config?.max_qty ?? 10_000}
            />
          </div>
        </section>

        {/* Histórico de Compras Table Card */}
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-black text-gray-900">Histórico de Compras</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5">Últimos pacotes de créditos extras adquiridos.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4">Data de Compra</th>
                  <th className="px-6 py-4">Pacote</th>
                  <th className="px-6 py-4 text-center">Quantidade</th>
                  <th className="px-6 py-4 text-center">Créditos Restantes</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">
                      Você ainda não adquiriu nenhum crédito extra.
                      <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
                        className="font-bold text-brand-yellow hover:text-yellow-600 ml-1 hover:underline focus:outline-none font-black"
                      >
                        Compre agora acima
                      </button>
                    </td>
                  </tr>
                ) : history.map(item => (
                  <tr key={item.package_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">{formatDateOnly(item.created_at)}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{packageLabel(item.package_slug)}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-brand-dark">{item.remaining}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(Number(item.price_gross || 0))}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black shadow-sm ${
                        item.payment_status === 'paid' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : item.payment_status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.payment_status === 'paid' 
                            ? 'bg-green-500' 
                            : item.payment_status === 'pending'
                              ? 'bg-amber-500'
                              : 'bg-gray-400'
                        }`} />
                        {STATUS_LABELS[item.payment_status] || item.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
            <p className="text-xs font-bold text-gray-400">Página {page}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => fetchHistory(page - 1)} className="bg-white hover:bg-gray-50 font-bold border border-gray-200">
                <ChevronLeft size={16} />
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={history.length < 10} onClick={() => fetchHistory(page + 1)} className="bg-white hover:bg-gray-50 font-bold border border-gray-200">
                Próxima
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
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export function useFiscalCredits(marketId) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [packages, setPackages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoadingSlug, setPurchaseLoadingSlug] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [config, setConfig] = useState({ min_qty: 1, max_qty: 10_000, unit_price: '0.72' });

  const fetchHistory = useCallback(async (nextPage = page) => {
    if (!marketId) return;
    const { data } = await api.get(`/fiscal/${marketId}/credits/history`, {
      params: { page: nextPage, per_page: 10 },
    });
    setHistory(data.items || []);
    setPage(data.page || nextPage);
  }, [marketId, page]);

  const fetchAll = useCallback(async () => {
    if (!marketId) return;
    setLoading(true);
    setError(null);
    try {
      const [balanceRes, packagesRes, historyRes, configRes] = await Promise.all([
        api.get(`/fiscal/${marketId}/credits/balance`),
        api.get('/fiscal/credits/packages'),
        api.get(`/fiscal/${marketId}/credits/history`, {
          params: { page: 1, per_page: 10 },
        }),
        api.get('/fiscal/credits/config'),
      ]);
      setBalance(balanceRes.data);
      setPackages(packagesRes.data.items || []);
      setHistory(historyRes.data.items || []);
      setPage(historyRes.data.page || 1);
      setConfig(configRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  const refreshBalance = useCallback(async () => {
    if (!marketId) return null;
    const { data } = await api.get(`/fiscal/${marketId}/credits/balance`);
    setBalance(data);
    return data;
  }, [marketId]);

  const initiatePurchase = useCallback(async (packageSlug) => {
    if (!marketId || purchaseLoadingSlug) return null;
    setPurchaseLoadingSlug(packageSlug);
    try {
      const ownerPart = user?.id || 'owner';
      const idempotencyKey = `mktf:${ownerPart}:${packageSlug}:${Date.now()}`;
      const { data } = await api.post(`/fiscal/${marketId}/credits/checkout`, {
        package_slug: packageSlug,
        idempotency_key: idempotencyKey,
      });
      if (data?.init_point) {
        window.location.href = data.init_point;
      }
      return data;
    } finally {
      setPurchaseLoadingSlug(null);
    }
  }, [marketId, purchaseLoadingSlug, user?.id]);

  const previewPrice = useCallback(async (qty) => {
    if (!qty || qty < 1) return null;
    const { data } = await api.get('/fiscal/credits/price', { params: { qty } });
    return data;
  }, []);

  const initiateCustomPurchase = useCallback(async (qty) => {
    if (!marketId) return null;
    const ownerPart = user?.id || 'owner';
    const idempotencyKey = `mktf:${ownerPart}:custom_${qty}:${Date.now()}`;
    const { data } = await api.post(`/fiscal/${marketId}/credits/checkout/custom`, {
      quantity: qty,
      idempotency_key: idempotencyKey,
    });
    if (data?.init_point) {
      window.location.href = data.init_point;
    }
    return data;
  }, [marketId, user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
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
    refreshBalance,
    initiatePurchase,
    previewPrice,
    initiateCustomPurchase,
  };
}

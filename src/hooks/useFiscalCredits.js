import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import api from '../lib/api';

function isValidUUID(uuid) {
  if (!uuid) return false;
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
  const isTestId = /^market-\d+$/.test(uuid);
  return isUuid || isTestId;
}

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
    if (!isValidUUID(marketId)) return;
    const { data } = await api.get(`/fiscal/${marketId}/credits/history`, {
      params: { page: nextPage, per_page: 10 },
    });
    setHistory(data.items || []);
    setPage(data.page || nextPage);
  }, [marketId, page]);

  const fetchAll = useCallback(async () => {
    if (!isValidUUID(marketId)) return;
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
    if (!isValidUUID(marketId)) return null;
    const { data } = await api.get(`/fiscal/${marketId}/credits/balance`);
    setBalance(data);
    return data;
  }, [marketId]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : ms));

  const pollCheckoutUrl = useCallback(async (jobId, maxAttempts = 30, intervalMs = 2000) => {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await api.get(`/fiscal/${marketId}/credits/checkout/status/${jobId}`);
      if (status.data.status === 'completed' && status.data.checkout_url) {
        return status.data.checkout_url;
      }
      if (status.data.status === 'failed') {
        throw new Error(status.data.error_message || 'Pagamento não pôde ser iniciado.');
      }
      await sleep(intervalMs);
    }
    throw new Error('Tempo esgotado aguardando checkout. Tente novamente.');
  }, [marketId]);

  const initiatePurchase = useCallback(async (packageSlug, onPhaseChange) => {
    if (!isValidUUID(marketId) || purchaseLoadingSlug) return null;
    setPurchaseLoadingSlug(packageSlug);
    setError(null);
    if (onPhaseChange) onPhaseChange('processing');
    try {
      const ownerPart = user?.id || 'owner';
      const idempotencyKey = `mktf:${ownerPart}:${packageSlug}:${Date.now()}`;
      const { data } = await api.post(`/fiscal/${marketId}/credits/checkout`, {
        package_slug: packageSlug,
        idempotency_key: idempotencyKey,
      });
      const jobId = data?.job_id;
      if (!jobId) {
        throw new Error('Não foi possível obter o ID do processamento.');
      }
      if (onPhaseChange) onPhaseChange('waiting_gateway');
      const checkoutUrl = await pollCheckoutUrl(jobId);
      window.location.href = checkoutUrl;
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setPurchaseLoadingSlug(null);
      if (onPhaseChange) onPhaseChange(null);
    }
  }, [marketId, purchaseLoadingSlug, user?.id, pollCheckoutUrl]);

  const previewPrice = useCallback(async (qty) => {
    if (!qty || qty < 1) return null;
    const { data } = await api.get('/fiscal/credits/price', { params: { qty } });
    return data;
  }, []);

  const initiateCustomPurchase = useCallback(async (qty, onPhaseChange) => {
    if (!isValidUUID(marketId)) return null;
    setError(null);
    if (onPhaseChange) onPhaseChange('processing');
    try {
      const ownerPart = user?.id || 'owner';
      const idempotencyKey = `mktf:${ownerPart}:custom_${qty}:${Date.now()}`;
      const { data } = await api.post(`/fiscal/${marketId}/credits/checkout/custom`, {
        quantity: qty,
        idempotency_key: idempotencyKey,
      });
      const jobId = data?.job_id;
      if (!jobId) {
        throw new Error('Não foi possível obter o ID do processamento.');
      }
      if (onPhaseChange) onPhaseChange('waiting_gateway');
      const checkoutUrl = await pollCheckoutUrl(jobId);
      window.location.href = checkoutUrl;
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      if (onPhaseChange) onPhaseChange(null);
    }
  }, [marketId, user?.id, pollCheckoutUrl]);

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

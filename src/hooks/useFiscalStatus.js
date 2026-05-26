/**
 * useFiscalStatus — polling de status fiscal para o PDV.
 *
 * Comportamento:
 * - Inicia polling a cada 2s quando saleId e marketId estão presentes.
 * - Para automaticamente quando status chega a estado terminal.
 * - Para após maxDurationMs (default 30s) para não prender o operador.
 * - Cleanup correto ao desmontar o componente.
 * - Evita race conditions com ref de cancelamento.
 *
 * Estados terminais (param automático):
 *   authorized, rejected, manual_action_required, canceled, not_requested
 *
 * Estados transitórios (continua polling):
 *   queued, processing, provider_error, sefaz_unavailable, offline_receipt_issued
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

const POLL_INTERVAL_MS = 2000;
const MAX_DURATION_MS = 30000;

const TERMINAL_STATUSES = new Set([
  'authorized',
  'rejected',
  'manual_action_required',
  'canceled',
  'not_requested',
  'offline_receipt_issued',
]);

const STATUS_LABELS = {
  queued: 'Aguardando emissão...',
  processing: 'Emitindo NFC-e...',
  authorized: 'NFC-e Autorizada',
  rejected: 'Rejeitada pela SEFAZ',
  provider_error: 'Erro no servidor fiscal',
  sefaz_unavailable: 'SEFAZ indisponível',
  offline_receipt_issued: 'Cupom não fiscal emitido',
  contingency_required: 'Contingência fiscal necessária',
  manual_action_required: 'Ação manual necessária',
  canceled: 'NFC-e Cancelada',
  not_requested: null,
};

/**
 * @param {object} params
 * @param {string|null} params.marketId
 * @param {string|null} params.saleId
 * @param {boolean}     params.enabled  — iniciar polling apenas quando true
 * @param {number}      params.maxDurationMs — timeout do polling (default 30s)
 * @param {function}    params.onAuthorized — callback quando NFC-e for autorizada
 * @param {function}    params.onTerminal   — callback quando qualquer estado terminal chegar
 */
export function useFiscalStatus({
  marketId,
  saleId,
  enabled = false,
  maxDurationMs = MAX_DURATION_MS,
  onAuthorized,
  onTerminal,
} = {}) {
  const [status, setStatus] = useState(null);
  const [fiscalData, setFiscalData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Refs para evitar closure stale e race conditions
  const cancelledRef = useRef(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const lastSaleIdRef = useRef(null);

  const stopPolling = useCallback((reason = 'manual') => {
    cancelledRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    if (cancelledRef.current || !marketId || !saleId) return;

    try {
      const { data } = await api.get(
        `/fiscal/${marketId}/sales/${saleId}/fiscal`
      );

      // Checa cancellation DEPOIS do await para evitar setState em componente desmontado
      if (cancelledRef.current) return;

      const newStatus = data?.status;
      setStatus(newStatus);
      setFiscalData(data);

      if (TERMINAL_STATUSES.has(newStatus)) {
        stopPolling('terminal');

        if (newStatus === 'authorized' && onAuthorized) {
          onAuthorized(data);
        }
        if (onTerminal) {
          onTerminal(newStatus, data);
        }
      }
    } catch (err) {
      // Erros de rede não param o polling — pode ser transiente
      if (cancelledRef.current) return;
      // Só logamos em dev para não poluir o console do operador
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useFiscalStatus] poll error:', err?.message);
      }
    }
  }, [marketId, saleId, onAuthorized, onTerminal, stopPolling]);

  useEffect(() => {
    // Limpar polling anterior quando saleId muda
    if (lastSaleIdRef.current !== saleId) {
      stopPolling('sale_changed');
      cancelledRef.current = false;
      setStatus(null);
      setFiscalData(null);
      setHasTimedOut(false);
      lastSaleIdRef.current = saleId;
    }

    if (!enabled || !marketId || !saleId) {
      return;
    }

    // Inicia polling
    cancelledRef.current = false;
    setIsPolling(true);

    // Primeira poll imediata
    poll();

    // Intervalo subsequente
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // Timeout máximo — libera o operador mesmo sem resposta terminal
    timeoutRef.current = setTimeout(() => {
      if (cancelledRef.current) return;
      setHasTimedOut(true);
      stopPolling('timeout');
    }, maxDurationMs);

    return () => {
      stopPolling('unmount');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, marketId, saleId]);

  return {
    status,
    fiscalData,
    isPolling,
    hasTimedOut,
    statusLabel: STATUS_LABELS[status] ?? null,
    isAuthorized: status === 'authorized',
    isRejected: status === 'rejected',
    isPending: status === 'queued' || status === 'processing',
    isTerminal: TERMINAL_STATUSES.has(status),
    stopPolling,
  };
}

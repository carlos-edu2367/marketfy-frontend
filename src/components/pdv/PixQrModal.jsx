import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import { Copy, X, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createPixQr,
  getPixAttempt,
  verifyPixAttempt,
  cancelPixAttempt,
  pixEventsUrl,
} from '../../lib/api';

const POLL_INTERVAL_MS = 3000;
const FINAL_STATUSES = ['approved', 'expired', 'canceled', 'cancelled'];

export default function PixQrModal({ marketId, terminalId, boxId, items, onApproved, onClose }) {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [now, setNow] = useState(Date.now());

  const createdRef = useRef(false);
  const eventSourceRef = useRef(null);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const applyAttemptUpdate = useCallback((data) => {
    setAttempt((prev) => ({ ...prev, ...data }));
    if (data.next_verify_allowed_at) {
      setCooldownUntil(new Date(data.next_verify_allowed_at).getTime());
    }
    if (data.status === 'approved') {
      onApproved({ ...attempt, ...data });
    }
  }, [attempt, onApproved]);

  const stopStreams = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((attemptId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getPixAttempt(marketId, attemptId);
        applyAttemptUpdate(data);
        if (FINAL_STATUSES.includes(data.status)) stopStreams();
      } catch {
        // keep polling; transient errors are expected
      }
    }, POLL_INTERVAL_MS);
  }, [marketId, applyAttemptUpdate, stopStreams]);

  const startEvents = useCallback((attemptId) => {
    try {
      const es = new EventSource(pixEventsUrl(marketId, attemptId));
      eventSourceRef.current = es;
      const handleEvent = (event) => {
        try {
          const data = JSON.parse(event.data);
          applyAttemptUpdate(data);
          if (FINAL_STATUSES.includes(data.status)) stopStreams();
        } catch {
          // ignore malformed event payloads
        }
      };
      ['payment.pending', 'payment.approved', 'payment.expired', 'payment.cancelled'].forEach((type) => {
        es.addEventListener(type, handleEvent);
      });
      es.onerror = () => {
        stopStreams();
        startPolling(attemptId);
      };
    } catch {
      startPolling(attemptId);
    }
  }, [marketId, applyAttemptUpdate, stopStreams, startPolling]);

  const createAttempt = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await createPixQr(marketId, { terminal_id: terminalId, box_id: boxId, items });
      setAttempt(data);
      if (data.next_verify_allowed_at) {
        setCooldownUntil(new Date(data.next_verify_allowed_at).getTime());
      }
      startEvents(data.attempt_id);
    } catch {
      toast.error('Não foi possível gerar o QR Code Pix.');
    } finally {
      setLoading(false);
    }
  }, [marketId, terminalId, boxId, items, startEvents]);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    createAttempt();
    return () => stopStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const handleVerify = async () => {
    if (!attempt) return;
    setVerifying(true);
    try {
      const { data } = await verifyPixAttempt(marketId, attempt.attempt_id);
      applyAttemptUpdate(data);
      if (data.status === 'approved') {
        stopStreams();
        onApproved({ ...attempt, ...data });
      }
    } catch {
      toast.error('Não foi possível verificar o pagamento agora.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = async () => {
    if (!attempt) return;
    try {
      await cancelPixAttempt(marketId, attempt.attempt_id);
    } catch {
      // best-effort: close regardless
    } finally {
      stopStreams();
      onClose();
    }
  };

  const handleRecreate = () => {
    stopStreams();
    createdRef.current = false;
    setAttempt(null);
    setCooldownUntil(null);
    createdRef.current = true;
    createAttempt();
  };

  const handleCopy = async () => {
    if (!attempt?.qr_data) return;
    try {
      await navigator.clipboard.writeText(attempt.qr_data);
      toast.success('Código copia-e-cola copiado.');
    } catch {
      toast.error('Não foi possível copiar o código.');
    }
  };

  const isFinal = attempt && FINAL_STATUSES.includes(attempt.status);
  const cooldownActive = cooldownUntil && cooldownUntil > now;
  const cooldownSeconds = cooldownActive ? Math.ceil((cooldownUntil - now) / 1000) : 0;

  const secondsLeft = attempt?.expires_at
    ? Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - now) / 1000))
    : null;
  const timerLabel = secondsLeft !== null
    ? `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 relative">
        <button onClick={handleCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>

        <h2 className="text-xl font-black text-gray-900 mb-1">Pagamento via Pix</h2>
        <p className="text-gray-500 text-sm mb-4">Peça para o cliente escanear o QR Code ou usar o copia-e-cola.</p>

        {loading && !attempt && (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
            <Loader2 size={20} className="animate-spin" /> Gerando QR Code...
          </div>
        )}

        {attempt && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-white border border-gray-200 rounded-2xl">
                <QRCodeSVG value={attempt.qr_data} size={200} />
              </div>
            </div>

            <div className="text-center">
              <p className="text-3xl font-black text-gray-900">{formatCurrency(Number(attempt.amount))}</p>
              {timerLabel && !isFinal && (
                <p className="text-sm text-gray-400 mt-1">Expira em {timerLabel}</p>
              )}
              {attempt.status === 'approved' && (
                <p className="text-green-600 font-bold mt-2">Pagamento aprovado!</p>
              )}
              {(attempt.status === 'expired') && (
                <p className="text-red-600 font-bold mt-2">QR Code expirado.</p>
              )}
              {(attempt.status === 'canceled' || attempt.status === 'cancelled') && (
                <p className="text-gray-600 font-bold mt-2">Cobrança cancelada.</p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-gray-600 truncate">{attempt.qr_data}</span>
              <button onClick={handleCopy} className="text-gray-500 hover:text-gray-700 shrink-0">
                <Copy size={18} />
              </button>
            </div>

            {!isFinal && (
              <Button
                onClick={handleVerify}
                isLoading={verifying}
                disabled={cooldownActive}
                className="w-full font-bold"
              >
                {cooldownActive ? `Verificar pagamento (${cooldownSeconds}s)` : 'Verificar pagamento'}
              </Button>
            )}

            <div className="flex gap-3">
              {!isFinal && (
                <Button variant="secondary" className="flex-1" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
              {isFinal && attempt.status !== 'approved' && (
                <Button variant="secondary" className="flex-1" onClick={handleRecreate}>
                  <RefreshCw size={16} /> Gerar novo QR
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

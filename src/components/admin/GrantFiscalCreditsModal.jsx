import { useEffect, useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import api, { getApiErrorMessage } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const REASON_OPTIONS = [
  { value: 'courtesy', label: 'Cortesia' },
  { value: 'compensation', label: 'Compensação' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'migration', label: 'Migração' },
];

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50_000;
const MIN_VALID_DAYS = 1;
const MAX_VALID_DAYS = 1095;

// A chave nasce com o modal, nao com o submit: um retry apos falha de rede
// reenvia a mesma chave e o backend trata como replay, sem creditar de novo.
function newIdempotencyKey() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `grant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function GrantFiscalCreditsModal({ userId, userName, onClose, onGranted }) {
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('100');
  const [reasonCode, setReasonCode] = useState('courtesy');
  const [note, setNote] = useState('');
  const [validDays, setValidDays] = useState('365');

  useEffect(() => {
    let cancelled = false;
    setLoadingBalance(true);
    api.get(`/admin/fiscal/credits/${userId}`)
      .then(({ data }) => {
        if (!cancelled) setBalance(data);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBalance(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount < MIN_AMOUNT || parsedAmount > MAX_AMOUNT) {
      setError('Informe uma quantidade entre 1 e 50.000 créditos.');
      return;
    }

    const parsedDays = Number(validDays);
    if (!Number.isInteger(parsedDays) || parsedDays < MIN_VALID_DAYS || parsedDays > MAX_VALID_DAYS) {
      setError('A validade deve ficar entre 1 e 1095 dias.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/admin/fiscal/credits/grant', {
        owner_id: userId,
        amount: parsedAmount,
        reason_code: reasonCode,
        note: note.trim() || null,
        valid_days: parsedDays,
        idempotency_key: idempotencyKey,
      });
      toast.success(
        data?.created === false
          ? 'Esta concessão já havia sido registrada.'
          : `${parsedAmount} créditos concedidos a ${userName}.`
      );
      onGranted?.(data);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível conceder os créditos.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-600 mx-auto">
          <Coins size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
          Conceder créditos NFC-e
        </h3>
        <p className="text-sm text-slate-500 text-center mb-5">
          Créditos gratuitos para <strong>{userName}</strong>, válidos em todas as lojas dele.
        </p>

        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
          {loadingBalance ? (
            <span className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Carregando saldo...
            </span>
          ) : balance ? (
            <>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Saldo atual
              </p>
              <p className="text-xl font-black text-slate-900">{balance.remaining} restantes</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {balance.included_limit} inclusos no plano + {balance.addon_limit} extras
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">Saldo indisponível no momento.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* O componente Input renderiza o <label> sem htmlFor, entao o
              aria-label e o que torna o campo acessivel e localizavel por
              getByLabelText nos testes. */}
          <Input
            id="grant-amount"
            label="Quantidade de créditos"
            aria-label="Quantidade de créditos"
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />

          <div className="space-y-1">
            <label htmlFor="grant-reason" className="text-sm font-medium text-slate-700">
              Categoria
            </label>
            <select
              id="grant-reason"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="grant-note" className="text-sm font-medium text-slate-700">
              Nota interna
            </label>
            <textarea
              id="grant-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contexto da concessão"
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-slate-900 bg-white text-sm"
            />
            <p className="text-[11px] text-slate-400">
              Registrada na auditoria — não visível ao cliente.
            </p>
          </div>

          <Input
            id="grant-valid-days"
            label="Validade (dias)"
            aria-label="Validade em dias"
            type="number"
            min={MIN_VALID_DAYS}
            max={MAX_VALID_DAYS}
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
              isLoading={submitting}
            >
              Conceder
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

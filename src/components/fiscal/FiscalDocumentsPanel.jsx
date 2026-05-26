/**
 * FiscalDocumentsPanel — painel operacional de documentos fiscais.
 *
 * Permite ao gerente/owner:
 * - Visualizar documentos por status (pendentes, rejeitados, autorizados, etc.)
 * - Reprocessar documentos com falha
 * - Cancelar NFC-e autorizada (com justificativa)
 * - Ver histórico de tentativas e eventos de um documento
 * - Filtrar por status, data, busca
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  RefreshCw, Search, AlertCircle, CheckCircle2, Clock,
  XCircle, FileText, ChevronDown, ChevronUp, RotateCcw,
  Ban, Filter, Loader2, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import CreditUsageBar from './CreditUsageBar';

const STATUS_CONFIG = {
  queued:                  { label: 'Na fila',          color: 'bg-blue-100 text-blue-700',    icon: Clock },
  processing:              { label: 'Processando',       color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
  authorized:              { label: 'Autorizado',        color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  rejected:                { label: 'Rejeitado',         color: 'bg-red-100 text-red-700',      icon: XCircle },
  provider_error:          { label: 'Erro provider',     color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  sefaz_unavailable:       { label: 'SEFAZ indisponível', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  offline_receipt_issued:  { label: 'Cupom não fiscal', color: 'bg-gray-100 text-gray-600',    icon: FileText },
  manual_action_required:  { label: 'Ação manual',      color: 'bg-red-100 text-red-700',      icon: AlertCircle },
  canceled:                { label: 'Cancelado',         color: 'bg-gray-100 text-gray-500',    icon: Ban },
  not_requested:           { label: 'Não solicitado',   color: 'bg-gray-100 text-gray-400',    icon: Info },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: Info };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function DocumentRow({ doc, marketId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelJustification, setCancelJustification] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadDetail = async () => {
    if (detail) { setExpanded(e => !e); return; }
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/fiscal/${marketId}/documents/${doc.id}`);
      setDetail(data);
      setExpanded(true);
    } catch {
      toast.error('Erro ao carregar detalhes do documento.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReprocess = async () => {
    setProcessing(true);
    try {
      await api.post(`/fiscal/${marketId}/documents/${doc.id}/reprocess`);
      toast.success('Documento recolocado na fila de emissão.');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao reprocessar.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (cancelJustification.trim().length < 15) {
      toast.error('Justificativa precisa ter ao menos 15 caracteres.');
      return;
    }
    setProcessing(true);
    const fd = new FormData();
    fd.append('justification', cancelJustification);
    try {
      await api.post(`/fiscal/${marketId}/documents/${doc.id}/cancel`, fd);
      toast.success('NFC-e cancelada com sucesso.');
      setShowCancelModal(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar.');
    } finally {
      setProcessing(false);
    }
  };

  const canReprocess = ['rejected', 'provider_error', 'sefaz_unavailable', 'manual_action_required'].includes(doc.status);
  const canCancel = doc.status === 'authorized';

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={loadDetail}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={doc.status} />
              <span className="text-xs text-gray-400 font-mono">
                {doc.series && doc.number ? `Série ${doc.series} Nº ${doc.number}` : 'Sem número'}
              </span>
              {doc.environment === 'homologacao' && (
                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">HOMOLOGAÇÃO</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 truncate">
              Venda: <span className="font-mono text-xs">{doc.sale_id}</span>
            </p>
            {doc.sefaz_message && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.sefaz_message}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-400 shrink-0">
            <p>{doc.created_at ? new Date(doc.created_at).toLocaleString('pt-BR') : '—'}</p>
            {doc.authorized_at && (
              <p className="text-green-600">Auth: {new Date(doc.authorized_at).toLocaleString('pt-BR')}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canReprocess && (
              <button
                onClick={e => { e.stopPropagation(); handleReprocess(); }}
                disabled={processing}
                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                title="Reprocessar"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              </button>
            )}
            {canCancel && (
              <button
                onClick={e => { e.stopPropagation(); setShowCancelModal(true); }}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                title="Cancelar NFC-e"
              >
                <Ban size={16} />
              </button>
            )}
            {loadingDetail ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : (
              expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </div>

        {expanded && detail && (
          <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
            {/* Dados principais */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {detail.access_key && (
                <div className="col-span-2">
                  <p className="font-bold text-gray-500 uppercase mb-1">Chave de Acesso</p>
                  <p className="font-mono text-gray-700 break-all">{detail.access_key}</p>
                </div>
              )}
              {detail.protocol && (
                <div>
                  <p className="font-bold text-gray-500 uppercase mb-1">Protocolo</p>
                  <p className="font-mono text-gray-700">{detail.protocol}</p>
                </div>
              )}
              {detail.provider_ref && (
                <div>
                  <p className="font-bold text-gray-500 uppercase mb-1">Ref Provider</p>
                  <p className="font-mono text-gray-700 truncate">{detail.provider_ref}</p>
                </div>
              )}
            </div>

            {/* Tentativas */}
            {detail.attempts?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tentativas ({detail.attempts.length})</p>
                <div className="space-y-1">
                  {detail.attempts.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-gray-100">
                      <span className={`w-2 h-2 rounded-full ${a.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="font-medium">#{a.attempt_number}</span>
                      <span className="text-gray-500">{a.operation}</span>
                      {a.http_status && <span className="text-gray-400">HTTP {a.http_status}</span>}
                      {a.duration_ms && <span className="text-gray-400">{a.duration_ms}ms</span>}
                      <span className="text-gray-400 text-[10px] ml-auto">
                        {a.started_at ? new Date(a.started_at).toLocaleTimeString('pt-BR') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eventos */}
            {detail.events?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Trilha de Eventos</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {detail.events.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 mt-0.5">
                        {e.created_at ? new Date(e.created_at).toLocaleTimeString('pt-BR') : ''}
                      </span>
                      <span className="text-gray-500 shrink-0 font-medium">[{e.source}]</span>
                      <span className="text-gray-700">{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Cancelar NFC-e</h3>
            <p className="text-sm text-gray-600">
              O cancelamento só é possível dentro do prazo legal (geralmente 24h).
              Informe a justificativa:
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"
              rows={3}
              placeholder="Justificativa (mínimo 15 caracteres)..."
              value={cancelJustification}
              onChange={e => setCancelJustification(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCancelModal(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleCancel}
                disabled={processing}
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function FiscalDocumentsPanel({ marketId }) {
  const [docs, setDocs] = useState([]);
  const [balance, setBalance] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchDocs = useCallback(async () => {
    if (!marketId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (selectedStatus) params.set('status', selectedStatus);

      const { data } = await api.get(`/fiscal/${marketId}/documents?${params}`);
      setDocs(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Erro ao carregar documentos fiscais.');
    } finally {
      setLoading(false);
    }
  }, [marketId, selectedStatus, page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    api.get(`/fiscal/${marketId}/credits/balance`)
      .then(({ data }) => {
        if (!cancelled) setBalance(data);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => { cancelled = true; };
  }, [marketId]);

  // Filtragem local por busca (sale_id ou chave de acesso)
  const filtered = searchQuery
    ? docs.filter(d =>
        d.sale_id?.includes(searchQuery) ||
        d.access_key?.includes(searchQuery) ||
        d.provider_ref?.includes(searchQuery)
      )
    : docs;

  const pendingCount = docs.filter(d =>
    ['queued', 'processing', 'provider_error', 'sefaz_unavailable', 'manual_action_required'].includes(d.status)
  ).length;

  return (
    <div className="space-y-4">
      {balance && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-800">Saldo de emissoes NFC-e</h3>
              <p className="text-xs text-gray-500">
                {balance.remaining} restantes no periodo atual
              </p>
            </div>
            <Link
              to={`/fiscal/credits?marketId=${marketId}`}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
            >
              Comprar creditos
            </Link>
          </div>
          <CreditUsageBar
            used={balance.used_count}
            includedLimit={balance.included_limit}
            addonLimit={balance.addon_limit}
            period={balance.period}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Documentos Fiscais</h2>
          <p className="text-sm text-gray-500">
            {total} documento{total !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 text-orange-600 font-bold">• {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchDocs}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-yellow focus:border-transparent outline-none"
            placeholder="Buscar por ID da venda ou chave..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            className="border border-gray-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-brand-yellow outline-none"
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setPage(0); }}
          >
            <option value="">Todos os status</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum documento fiscal encontrado</p>
          {selectedStatus && (
            <button
              className="mt-2 text-sm text-blue-500 hover:underline"
              onClick={() => setSelectedStatus('')}
            >
              Limpar filtro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              marketId={marketId}
              onRefresh={fetchDocs}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="h-8 px-3 text-sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3 text-sm"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

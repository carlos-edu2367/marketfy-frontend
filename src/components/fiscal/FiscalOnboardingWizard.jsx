/**
 * FiscalOnboardingWizard — wizard guiado de configuração fiscal.
 *
 * Exibe o checklist de homologação com status de cada etapa,
 * botão de validar configuração e ativar produção.
 * Reduz configurações incorretas e suporte manual.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import {
  CheckCircle2, Circle, AlertCircle, AlertTriangle,
  RefreshCw, ChevronRight, Rocket, Loader2,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_STYLE = {
  ok:      { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  error:   { icon: AlertCircle,   color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200' },
  pending: { icon: Circle,        color: 'text-gray-400',   bg: 'bg-gray-50',    border: 'border-gray-200' },
};

const OVERALL_MESSAGES = {
  incomplete:           { label: 'Configuração Incompleta', color: 'text-gray-600',  bg: 'bg-gray-100' },
  ready_for_test:       { label: 'Pronto para Testar',     color: 'text-blue-700',  bg: 'bg-blue-100' },
  test_done:            { label: 'Testes Concluídos',      color: 'text-purple-700', bg: 'bg-purple-100' },
  ready_for_production: { label: 'Pronto para Produção',   color: 'text-green-700', bg: 'bg-green-100' },
};

function ChecklistStep({ item, index }) {
  const style = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
  const StatusIcon = style.icon;
  return (
    <div className={clsx(
      'flex items-start gap-4 p-4 rounded-xl border transition-colors',
      style.bg, style.border
    )}>
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white border', style.border)}>
        <StatusIcon size={18} className={style.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">Etapa {index + 1}</span>
          {!item.required_for_production && (
            <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold">Opcional</span>
          )}
        </div>
        <p className="font-bold text-gray-800 text-sm mt-0.5">{item.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
        {item.details && (
          <p className={clsx('text-xs mt-1.5 font-medium', style.color)}>{item.details}</p>
        )}
      </div>
      <div className="shrink-0">
        {item.status === 'ok' ? (
          <span className="text-xs font-bold text-green-600">✓ OK</span>
        ) : item.status === 'warning' ? (
          <span className="text-xs font-bold text-yellow-600">! Atenção</span>
        ) : (
          <span className="text-xs font-bold text-gray-400">Pendente</span>
        )}
      </div>
    </div>
  );
}

export default function FiscalOnboardingWizard({ marketId, onConfigureClick }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!marketId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/fiscal/${marketId}/onboarding`);
      setStatus(data);
    } catch {
      toast.error('Erro ao carregar status de onboarding.');
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const { data } = await api.post(`/fiscal/${marketId}/config/validate`);
      if (data.valid) {
        toast.success('Configuração validada com sucesso!');
        fetchStatus();
      } else {
        const errs = (data.errors || []).join('\n');
        toast.error(`Erros encontrados:\n${errs}`, { duration: 8000 });
      }
    } catch {
      toast.error('Erro ao validar configuração.');
    } finally {
      setValidating(false);
    }
  };

  const handleActivate = async () => {
    if (!window.confirm('Confirma a ativação da emissão fiscal em produção? Esta ação começará a emitir NFC-e reais.')) return;
    setActivating(true);
    try {
      await api.post(`/fiscal/${marketId}/config/enable`);
      toast.success('Emissão fiscal em produção ativada!');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao ativar produção.');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!status) return null;

  const overallCfg = OVERALL_MESSAGES[status.overall_status] || OVERALL_MESSAGES.incomplete;

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className={clsx('rounded-2xl p-5', overallCfg.bg)}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Status do Onboarding</p>
            <p className={clsx('text-xl font-black mt-0.5', overallCfg.color)}>{overallCfg.label}</p>
          </div>
          <button
            onClick={fetchStatus}
            className="p-2 rounded-xl hover:bg-white/50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso</span>
            <span className="font-bold">{status.completion_pct}%</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-current rounded-full transition-all duration-700"
              style={{ width: `${status.completion_pct}%`, color: overallCfg.color }}
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {(status.checklist || []).map((item, i) => (
          <ChecklistStep key={item.key} item={item} index={i} />
        ))}
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {onConfigureClick && (
          <Button
            variant="secondary"
            className="flex-1 h-12 font-bold"
            onClick={onConfigureClick}
          >
            <Settings size={18} className="mr-2" /> Configurar Dados Fiscais
          </Button>
        )}

        <Button
          className="flex-1 h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleValidate}
          disabled={validating}
        >
          {validating ? (
            <Loader2 size={18} className="animate-spin mr-2" />
          ) : (
            <CheckCircle2 size={18} className="mr-2" />
          )}
          Validar Configuração
        </Button>

        {status.can_activate_production && (
          <Button
            className="flex-1 h-12 font-bold bg-green-600 hover:bg-green-700 text-white"
            onClick={handleActivate}
            disabled={activating}
          >
            {activating ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : (
              <Rocket size={18} className="mr-2" />
            )}
            Ativar Produção
          </Button>
        )}
      </div>

      {status.missing_required?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-700 mb-2">Ainda falta para produção:</p>
          <ul className="space-y-1">
            {status.missing_required.map(key => {
              const item = status.checklist?.find(c => c.key === key);
              return (
                <li key={key} className="flex items-center gap-2 text-sm text-amber-700">
                  <ChevronRight size={14} />
                  {item?.label || key}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

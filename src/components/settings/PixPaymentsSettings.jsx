import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { QrCode, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  pixOauthStatus,
  pixOauthAuthorize,
  pixOauthTest,
  pixOauthDisconnect,
  pixUpdateSettings,
} from '../../lib/api';

const STATUS_INFO = {
  not_connected: { label: 'Não conectado', color: 'text-gray-500 bg-gray-100', icon: XCircle },
  connected: { label: 'Conectado', color: 'text-green-700 bg-green-50', icon: CheckCircle },
  reauthorization_required: { label: 'Reautorização necessária', color: 'text-yellow-700 bg-yellow-50', icon: AlertTriangle },
};

export default function PixPaymentsSettings({ marketId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feesAck, setFeesAck] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingEnabled, setSavingEnabled] = useState(false);

  const load = async () => {
    try {
      const { data } = await pixOauthStatus(marketId);
      setStatus(data);
      setFeesAck(Boolean(data?.fees_acknowledged));
    } catch {
      toast.error('Não foi possível carregar o status da integração Pix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [marketId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('pix_oauth');
    if (p === 'success') toast.success('Conta Mercado Pago conectada.');
    if (p === 'denied') toast('Conexão cancelada.');
    if (p === 'error') toast.error('Falha ao conectar. Tente novamente.');
    if (p) {
      const url = new URL(window.location);
      url.searchParams.delete('pix_oauth');
      window.history.replaceState({}, '', url);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    try {
      const { data } = await pixOauthAuthorize(marketId);
      window.location.href = data.authorization_url;
    } catch {
      toast.error('Não foi possível iniciar a conexão com o Mercado Pago.');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await pixOauthTest(marketId);
      toast.success('Conexão testada com sucesso.');
    } catch {
      toast.error('Falha ao testar a conexão.');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await pixOauthDisconnect(marketId);
      toast.success('Conta Mercado Pago desconectada.');
      await load();
    } catch {
      toast.error('Falha ao desconectar.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleEnabled = async (enabled) => {
    setSavingEnabled(true);
    try {
      await pixUpdateSettings(marketId, { enabled_in_pdv: enabled, fees_acknowledged: feesAck });
      await load();
    } catch {
      toast.error('Não foi possível salvar as configurações.');
    } finally {
      setSavingEnabled(false);
    }
  };

  const handleFeesAckChange = async (checked) => {
    setFeesAck(checked);
    try {
      await pixUpdateSettings(marketId, { fees_acknowledged: checked });
    } catch {
      toast.error('Não foi possível salvar a confirmação de tarifas.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-gray-500">
        <Loader2 size={18} className="animate-spin" /> Carregando...
      </div>
    );
  }

  const isConnected = status?.status === 'connected';
  const statusInfo = STATUS_INFO[status?.status] || STATUS_INFO.not_connected;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <QrCode size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Pagamentos Pix</h3>
          <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
            <StatusIcon size={12} /> {statusInfo.label}
          </div>
        </div>
      </div>

      {!isConnected && (
        <Button onClick={connect} className="font-bold">
          Conectar Mercado Pago
        </Button>
      )}

      {isConnected && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Conta conectada{status?.nickname ? `: ${status.nickname}` : ''}
            {status?.email ? ` (${status.email})` : ''}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleTest} isLoading={testing}>
              Testar
            </Button>
            <Button variant="danger" onClick={handleDisconnect} isLoading={disconnecting}>
              Desconectar
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(status?.enabled_in_pdv)}
              disabled={!feesAck}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            Habilitar no PDV
          </label>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 text-sm text-yellow-900 space-y-3">
        <p>
          O gateway de pagamentos cobra tarifas sobre transações Pix processadas pela sua conta.
          A Neectify não adiciona tarifa sobre esta transação.
        </p>
        <a
          href="https://www.mercadopago.com.br/ajuda/tarifas"
          target="_blank"
          rel="noreferrer"
          className="underline font-bold"
        >
          Ver tarifas oficiais do gateway
        </a>
        {isConnected && (
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={feesAck}
              onChange={(e) => handleFeesAckChange(e.target.checked)}
            />
            Estou ciente das tarifas cobradas pelo Mercado Pago
          </label>
        )}
      </div>
    </div>
  );
}

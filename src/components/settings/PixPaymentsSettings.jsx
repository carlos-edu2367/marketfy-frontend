import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { QrCode, CheckCircle, XCircle, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  pixOauthStatus,
  pixOauthAuthorize,
  pixOauthTest,
  pixOauthDisconnect,
  pixUpdateSettings,
  getPixLocation,
} from '../../lib/api';
import PixLocationSetup from './PixLocationSetup';

// Data de referência da informação pública de tarifas exibida ao lojista.
// A spec (10-frontend-ux-spec.md §2.4) pede que este texto seja administrável;
// enquanto o painel de administração não existe, a data fica explícita aqui e
// deve ser revisada junto com a fonte oficial.
const FEES_REFERENCE_DATE = '20/07/2026';

const STATUS_INFO = {
  not_connected: { label: 'Não conectado', color: 'text-gray-500 bg-gray-100', icon: XCircle },
  connected: { label: 'Conectado', color: 'text-green-700 bg-green-50', icon: CheckCircle },
  reauthorization_required: { label: 'Reautorização necessária', color: 'text-yellow-700 bg-yellow-50', icon: AlertTriangle },
};

export default function PixPaymentsSettings({ marketId }) {
  const locationStepRequested = new URLSearchParams(window.location.search).get('step') === 'location';
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feesAck, setFeesAck] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingEnabled, setSavingEnabled] = useState(false);
  const [location, setLocation] = useState(null);
  const [showLocationSetup, setShowLocationSetup] = useState(false);

  const load = async () => {
    try {
      const { data } = await pixOauthStatus(marketId);
      setStatus(data);
      setFeesAck(Boolean(data?.fees_acknowledged));
      if (data?.status === 'connected') {
        const locationResponse = await getPixLocation(marketId);
        setLocation(locationResponse.data);
        if (locationStepRequested) setShowLocationSetup(true);
      } else {
        setLocation(null);
      }
    } catch {
      toast.error('Não foi possível carregar o status da integração Pix.');
    } finally {
      setLoading(false);
    }
  };

  // `load` is intentionally scoped to this component and depends on the market/query step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [marketId, locationStepRequested]);

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
    if (enabled && location?.status !== 'ready') {
      setShowLocationSetup(true);
      return;
    }
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
  const locationReady = location?.status === 'ready';
  const statusInfo = STATUS_INFO[status?.status] || STATUS_INFO.not_connected;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <QrCode size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Pagamentos Pix (Mercado Pago)</h3>
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
              disabled={savingEnabled || !feesAck || (!locationReady && !status?.enabled_in_pdv)}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            Habilitar no PDV
          </label>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={18} className={locationReady ? 'text-green-600' : 'text-amber-600'} />
              <div>
                <p className="font-bold text-gray-900">Localização da loja</p>
                {locationReady ? (
                  <p className="text-sm text-green-700">Endereço e ponto no mapa confirmados.</p>
                ) : (
                  <p className="text-sm text-amber-700">Configure a localização antes de habilitar o Pix no PDV.</p>
                )}
              </div>
            </div>
            {!locationReady && <Button type="button" variant="secondary" onClick={() => setShowLocationSetup(true)}>Configurar localização</Button>}
            {showLocationSetup && <PixLocationSetup marketId={marketId} onSaved={(data) => { setLocation(data); setShowLocationSetup(false); }} />}
          </div>
        </div>
      )}

      <div
        data-testid="pix-fees-notice"
        className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 text-sm text-yellow-900 space-y-3"
      >
        <p>
          Os pagamentos serão processados pelo Mercado Pago e o dinheiro será recebido{' '}
          <strong>na conta Mercado Pago da sua loja</strong>. O Mercado Pago pode cobrar tarifas
          sobre a operação — atualmente, receber Pix por QR Code costuma ser <strong>isento</strong>{' '}
          para muitos vendedores, mas pode haver tarifa (ex.: 0,49%) dependendo do perfil da sua
          conta, contrato, prazo de recebimento e promoções. Essa condição é definida pelo Mercado
          Pago, pode variar e mudar no futuro. Consulte as tarifas oficiais antes de ativar.{' '}
          <strong>A Neectify não adiciona tarifa sobre esta transação.</strong>
        </p>
        <p className="text-xs opacity-80">
          Informação de tarifas atualizada em {FEES_REFERENCE_DATE}. A condição real da sua conta
          pode ser diferente — confirme sempre na fonte oficial.
        </p>
        <a
          href="https://www.mercadopago.com.br/developers/pt/support/37740"
          target="_blank"
          rel="noreferrer"
          className="underline font-bold"
        >
          Ver tarifas oficiais do Mercado Pago
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

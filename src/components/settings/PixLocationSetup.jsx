import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, MapPin, Navigation, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { getPixLocation, lookupAddressByCep, savePixLocation } from '../../lib/api';

const LocationMap = lazy(() => import('./LocationMap'));

const EMPTY_FORM = {
  postal_code: '', street_name: '', street_number: '', district: '', complement: '',
  city_name: '', state_code: '', state_name: '', source: 'manual',
};

const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

const normalize = value => String(value || '').replace(/\D/g, '').slice(0, 8);

export default function PixLocationSetup({ marketId, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPixLocation(marketId)
      .then(({ data }) => {
        if (!active || data.status === 'not_configured') return;
        setForm(current => ({ ...current, ...data, postal_code: normalize(data.postal_code) }));
        setCoordinates({ latitude: data.latitude, longitude: data.longitude });
      })
      .catch(() => active && setError('Não foi possível carregar a localização salva.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [marketId]);

  useEffect(() => {
    const cep = normalize(form.postal_code);
    if (cep.length !== 8) return undefined;
    const timer = setTimeout(async () => {
      setCepLoading(true);
      try {
        const { data } = await lookupAddressByCep(cep);
        setForm(current => ({
          ...current, postal_code: cep, street_name: data.street_name || current.street_name,
          district: data.district || current.district, city_name: data.city_name || current.city_name,
          state_code: data.state_code || current.state_code,
          state_name: STATE_NAMES[data.state_code] || current.state_name,
        }));
      } catch {
        // O formulário continua editável manualmente se o CEP não responder.
      } finally {
        setCepLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.postal_code]);

  const updateField = field => event => {
    const value = field === 'postal_code' ? normalize(event.target.value) : event.target.value;
    setForm(current => ({ ...current, [field]: value, ...(field === 'state_code' ? { state_name: STATE_NAMES[value] || '' } : {}) }));
    setError('');
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Seu navegador não oferece localização automática. Ajuste o ponto no mapa.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setForm(current => ({ ...current, source: 'browser_geolocation' }));
        setMapOpen(true);
        setError('');
      },
      () => setError('Não foi possível obter sua localização. Você pode marcar o ponto manualmente.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const requiredFields = useMemo(
    () => ['postal_code', 'street_name', 'street_number', 'city_name', 'state_code', 'state_name'],
    [],
  );

  const save = async event => {
    event.preventDefault();
    const missing = requiredFields.find(field => !String(form[field] || '').trim());
    if (missing) {
      setError('Preencha o endereço completo antes de salvar.');
      return;
    }
    if (coordinates.latitude == null || coordinates.longitude == null) {
      setError('Confirme o ponto no mapa antes de salvar a localização.');
      setMapOpen(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await savePixLocation(marketId, {
        ...form, latitude: coordinates.latitude, longitude: coordinates.longitude,
      });
      toast.success('Localização salva. O Pix está pronto para ser ativado.');
      onSaved?.(data);
    } catch (requestError) {
      setError(requestError.response?.data?.detail?.field || 'Não foi possível salvar a localização.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-8 text-gray-500"><Loader2 size={18} className="animate-spin" /> Carregando localização...</div>;

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-teal-50 p-3 text-teal-700"><MapPin size={20} /></div>
        <div>
          <h4 className="font-bold text-gray-900">Localização da loja</h4>
          <p className="text-sm text-gray-600">Precisamos confirmar o endereço e o ponto do mercado para registrar o caixa no Mercado Pago.</p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <label className="text-sm font-semibold text-gray-700">CEP
          <div className="relative mt-1"><input aria-label="CEP" value={form.postal_code} onChange={updateField('postal_code')} inputMode="numeric" maxLength={8} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="00000000" />{cepLoading && <Loader2 size={16} className="absolute right-2 top-2 animate-spin text-gray-400" />}</div>
        </label>
        <label className="text-sm font-semibold text-gray-700">Logradouro
          <input aria-label="Logradouro" value={form.street_name} onChange={updateField('street_name')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <label className="text-sm font-semibold text-gray-700">Número
          <input aria-label="Número" value={form.street_number} onChange={updateField('street_number')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-gray-700">Bairro
          <input aria-label="Bairro" value={form.district} onChange={updateField('district')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <label className="text-sm font-semibold text-gray-700">Cidade
          <input aria-label="Cidade" value={form.city_name} onChange={updateField('city_name')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-gray-700">UF
          <select aria-label="UF" value={form.state_code} onChange={updateField('state_code')} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
            <option value="">Selecione</option>{Object.keys(STATE_NAMES).map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold text-gray-700">Complemento <span className="font-normal text-gray-400">(opcional)</span>
        <input aria-label="Complemento" value={form.complement} onChange={updateField('complement')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
      </label>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setMapOpen(current => !current)}>
            <MapPin size={16} /> {mapOpen ? 'Ocultar mapa' : 'Abrir mapa para confirmar'}
          </Button>
          <Button type="button" variant="secondary" onClick={useCurrentLocation}><Navigation size={16} /> Usar minha localização</Button>
        </div>
        {mapOpen && <Suspense fallback={<div className="flex h-72 items-center justify-center text-gray-500"><Loader2 className="mr-2 animate-spin" /> Carregando mapa...</div>}><LocationMap {...coordinates} onChange={point => { setCoordinates(point); setForm(current => ({ ...current, source: 'map_pin' })); setError(''); }} /></Suspense>}
        <p className="text-xs text-gray-500">O ponto será usado somente para identificar a loja no Mercado Pago. Revise-o antes de salvar.</p>
      </div>

      <div className="flex justify-end"><Button type="submit" isLoading={saving}><Save size={16} /> Salvar localização</Button></div>
    </form>
  );
}

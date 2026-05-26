import { useEffect, useRef, useState } from 'react';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import api from '../../lib/api';

const DEBOUNCE_MS = 400;
const MIN_QTY = 10;
const MAX_QTY = 10_000;

export default function CustomQuantityInput({ onPurchase, loading = false }) {
  const [qty, setQty] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    const parsed = parseInt(qty, 10);
    setPreview(null);
    setError('');

    if (!qty || isNaN(parsed)) return;

    if (parsed < MIN_QTY) {
      setError(`Minimo ${MIN_QTY} creditos.`);
      return;
    }
    if (parsed > MAX_QTY) {
      setError(`Maximo ${MAX_QTY} creditos por compra.`);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const { data } = await api.get('/fiscal/credits/price', { params: { qty: parsed } });
        setPreview(data);
      } catch {
        setError('Nao foi possivel calcular o preco.');
      } finally {
        setPreviewLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [qty]);

  const handlePurchase = () => {
    const parsed = parseInt(qty, 10);
    if (!parsed || parsed < MIN_QTY || parsed > MAX_QTY) return;
    onPurchase(parsed);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-black text-gray-900">Quantidade personalizada</h3>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              aria-label="Quantidade de creditos"
              min={MIN_QTY}
              max={MAX_QTY}
              placeholder="Ex: 250"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <span className="whitespace-nowrap text-sm font-medium text-gray-500">creditos</span>
          </div>
          {error && (
            <p role="alert" className="mt-1 text-xs font-bold text-red-600">{error}</p>
          )}
          {previewLoading && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Calculando...
            </p>
          )}
          {preview && !previewLoading && (
            <p id="custom-price-preview" className="mt-1 text-xs font-bold text-gray-600">
              {formatCurrency(Number(preview.price_gross))}
              <span className="ml-1 font-normal text-gray-400">
                (R$ {preview.unit_price}/credito)
              </span>
            </p>
          )}
        </div>

        <Button
          disabled={loading || previewLoading || !preview || !!error}
          aria-describedby={preview ? 'custom-price-preview' : undefined}
          onClick={handlePurchase}
          className="font-black"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
          Comprar
        </Button>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Minimo {MIN_QTY} creditos · R$ 0,42 por credito
      </p>
    </div>
  );
}

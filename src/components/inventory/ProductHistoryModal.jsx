import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { X, ArrowUpCircle, ArrowDownCircle, ShoppingCart, AlertCircle, Loader2, RotateCcw } from 'lucide-react';

export default function ProductHistoryModal({ product, marketId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await api.get(`/inventory/${marketId}/products/${product.id}/history`);
        setHistory(data);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [product, marketId]);

  // Normaliza o tipo para evitar erros de case/espaços e garantir match com o Enum
  const normalizeType = (type) => String(type || '').toLowerCase().trim();

  const getIcon = (rawType) => {
    const type = normalizeType(rawType);
    
    switch (type) {
        case 'entrada': 
        case 'ajuste_entrada': 
            return <ArrowUpCircle className="text-green-500" size={20} />;
        
        case 'venda': 
            return <ShoppingCart className="text-gray-500" size={20} />;
        
        case 'devolucao':
            return <RotateCcw className="text-blue-500" size={20} />;

        case 'ajuste_saida': 
        case 'sangria_estoque': 
        case 'saida': // Fallback
            return <ArrowDownCircle className="text-red-500" size={20} />;
        
        default: return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  const getLabel = (rawType) => {
      const type = normalizeType(rawType);
      if (!type) return 'Movimentação';
      
      const labels = {
          'entrada': 'Entrada',
          'ajuste_entrada': 'Ajuste (Entrada)',
          'venda': 'Venda',
          'devolucao': 'Devolução',
          'ajuste_saida': 'Ajuste (Saída)',
          'sangria_estoque': 'Perda / Quebra',
          'saida': 'Saída'
      };
      
      return labels[type] || String(rawType).toUpperCase();
  };

  // Define quais tipos subtraem do estoque (Sinal -)
  // Baseado no Enum: SALE, ADJUSTMENT_SUB, LOSS
  const isNegative = (rawType) => {
      const type = normalizeType(rawType);
      return [
          'venda', 
          'ajuste_saida', 
          'sangria_estoque',
          'saida', // Fallback caso backend envie string genérica
          'perda', // Fallback
          'quebra' // Fallback
      ].includes(type);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Histórico de Estoque</h2>
                    <p className="text-sm text-gray-500">{product.name}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-gray-400" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center text-gray-400 py-10 border-2 border-dashed border-gray-100 rounded-xl">
                        Nenhuma movimentação registrada.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {history.map((mov) => {
                            const isNeg = isNegative(mov.type);
                            // Garante valor absoluto para controlar o sinal visualmente
                            const quantity = Math.abs(Number(mov.quantity || 0));
                            
                            return (
                                <div key={mov.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="mt-1 p-2 bg-white rounded-full shadow-sm">{getIcon(mov.type)}</div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800">{getLabel(mov.type)}</p>
                                        {mov.reason && <p className="text-sm text-gray-500 italic mt-0.5">&quot;{mov.reason}&quot;</p>}
                                        <p className="text-xs text-gray-400 mt-2 font-medium">{formatDate(mov.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xl font-black ${isNeg ? 'text-red-500' : 'text-green-600'}`}>
                                            {quantity.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-center text-xs text-gray-400">
                Mostrando últimas movimentações
            </div>
        </div>
    </div>
  );
}
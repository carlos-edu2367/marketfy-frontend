import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Printer, Loader2, ShoppingBag, Store, Search, CheckCircle, XCircle, Eye, X, User, Package } from 'lucide-react';
import { Receipt } from '../../components/pdv/Receipt';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function SalesHistory() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [limit, setLimit] = useState(50);
  
  // Estado para impressão
  const [selectedSale, setSelectedSale] = useState(null);
  const [marketInfo, setMarketInfo] = useState(null);
  const receiptRef = useRef(null);

  // Estado para modal de detalhes
  const [detailsModal, setDetailsModal] = useState({ open: false, sale: null, loading: false });

  // 1. Carrega Mercados
  useEffect(() => {
    async function loadMarkets() {
      try {
        const { data } = await api.get('/identity/markets');
        setMarkets(data);
        if (data.length > 0) {
            setSelectedMarketId(data[0].id);
            setMarketInfo(data[0]); // Salva info para o recibo
        } else {
            setLoading(false);
        }
      } catch (error) {
        toast.error('Erro ao carregar lojas.');
        setLoading(false);
      }
    }
    loadMarkets();
  }, []);

  // Atualiza info do mercado quando selecionado
  useEffect(() => {
      if (selectedMarketId && markets.length > 0) {
          const m = markets.find(x => x.id === selectedMarketId);
          if (m) setMarketInfo(m);
      }
  }, [selectedMarketId, markets]);

  // 2. Carrega Histórico
  const loadSales = useCallback(async () => {
    if (!selectedMarketId) return;
    
    setLoading(true);
    try {
        const { data } = await api.get(`/sales/${selectedMarketId}`, {
            params: { 
                limit: limit, 
                offset: 0 
            }
        });
        setSales(data);
    } catch (error) {
        console.error("Erro ao carregar vendas:", error);
        toast.error("Erro ao carregar histórico de vendas.");
    } finally {
        setLoading(false);
    }
  }, [selectedMarketId, limit]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Handler de Detalhes
  const handleViewDetails = async (saleId) => {
      setDetailsModal({ open: true, sale: null, loading: true });
      try {
          const { data } = await api.get(`/sales/${selectedMarketId}/${saleId}`);
          setDetailsModal({ open: true, sale: data, loading: false });
      } catch (error) {
          console.error("Erro ao carregar detalhes:", error);
          toast.error("Erro ao carregar detalhes da venda.");
          setDetailsModal({ open: false, sale: null, loading: false });
      }
  };

  // Handler de Impressão (CORRIGIDO PARA GARANTIR RENDERIZAÇÃO)
  const handlePrint = (sale) => {
      setSelectedSale(sale);
      
      // Pequeno timeout para garantir que o React renderizou o <Receipt> com os novos dados
      setTimeout(() => {
          window.print();
      }, 300);
  };

  // Helper para Status da Nota Fiscal
  const renderInvoiceStatus = (sale) => {
      const inv = sale.invoice;
      if (!inv) return <span className="text-gray-400 text-xs">—</span>;
      
      if (inv.status === 'autorizada') {
          return (
              <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle size={12} /> NFC-e Autorizada
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-mono">{inv.number ? `#${inv.number}` : ''}</span>
              </div>
          );
      }
      if (inv.status === 'erro' || inv.status === 'rejeitada') {
          return (
              <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full" title={inv.error_message}>
                  <XCircle size={12} /> Erro Emissão
              </span>
          );
      }
      return (
          <span className="flex items-center gap-1 text-yellow-600 text-xs font-bold bg-yellow-50 px-2 py-1 rounded-full">
              <Loader2 size={12} className="animate-spin" /> Processando
          </span>
      );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        
        {/* COMPONENTE DE IMPRESSÃO - SEMPRE MONTADO, VISÍVEL APENAS NA IMPRESSÃO */}
        <div style={{ display: 'none' }}>
           <Receipt ref={receiptRef} sale={selectedSale} marketInfo={marketInfo} isOffline={false} />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="text-brand-yellow" /> Histórico de Vendas
                </h1>
                <p className="text-gray-500">Consulte vendas realizadas, reimprima comprovantes e verifique notas fiscais.</p>
            </div>
            
            <div className="flex gap-3">
                {markets.length > 1 && (
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                        <Store size={16} className="text-gray-400" />
                        <select 
                            value={selectedMarketId}
                            onChange={(e) => setSelectedMarketId(e.target.value)}
                            className="bg-transparent outline-none text-sm font-bold text-gray-700"
                        >
                            {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                )}
                <Button variant="secondary" onClick={loadSales}>
                    Atualizar
                </Button>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Filtros Simples */}
            <div className="p-4 border-b border-gray-100 flex gap-4 items-center bg-gray-50/50">
                <Search className="text-gray-400" size={20} />
                <span className="text-sm text-gray-500 font-medium">Exibindo as últimas</span>
                <select 
                    value={limit} 
                    onChange={e => setLimit(Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-brand-yellow"
                >
                    <option value={20}>20 vendas</option>
                    <option value={50}>50 vendas</option>
                    <option value={100}>100 vendas</option>
                </select>
            </div>

            {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-yellow" size={40} /></div>
            ) : sales.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhuma venda encontrada neste período.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Data / Hora</th>
                                <th className="px-6 py-3">Itens</th>
                                <th className="px-6 py-3">Pagamento</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-center">Fiscal (NFC-e)</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {formatDate(sale.created_at)}
                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate w-24" title={sale.id}>
                                            ID: {sale.id.slice(0,8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {sale.items?.slice(0, 2).map((item, i) => (
                                                <span key={i} className="text-gray-600 text-xs">
                                                    {Number(item.quantity)}x {item.name}
                                                </span>
                                            ))}
                                            {(sale.items?.length || 0) > 2 && (
                                                <span className="text-[10px] text-gray-400 font-bold">
                                                    +{sale.items.length - 2} outros itens
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {sale.payments?.map((p, i) => (
                                            <span key={i} className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-1 border border-gray-200">
                                                {p.method.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 text-lg">
                                        {formatCurrency(sale.total_amount)}
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center">
                                        {renderInvoiceStatus(sale)}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleViewDetails(sale.id)}
                                                className="text-blue-500 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 rounded-full group"
                                                title="Ver Detalhes"
                                            >
                                                <Eye size={18} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={() => handlePrint(sale)}
                                                className="text-gray-400 hover:text-brand-dark transition-colors p-2 hover:bg-gray-200 rounded-full group"
                                                title="Imprimir Cupom"
                                            >
                                                <Printer size={18} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* MODAL DE DETALHES */}
        {detailsModal.open && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Detalhes da Venda</h2>
                            <p className="text-sm text-gray-500 font-mono">ID: {detailsModal.sale?.id || 'Carregando...'}</p>
                        </div>
                        <button onClick={() => setDetailsModal({ ...detailsModal, open: false })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {detailsModal.loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-yellow" size={48} /></div>
                        ) : detailsModal.sale ? (
                            <div className="space-y-8">
                                {/* ... Detalhes (Mantidos iguais) ... */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Data</p>
                                        <p className="font-medium text-gray-900">{formatDate(detailsModal.sale.created_at)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 font-bold uppercase">Status</p>
                                        <p className="font-medium text-gray-900 capitalize">{detailsModal.sale.status}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2">
                                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Cliente</p>
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-gray-400" />
                                            {detailsModal.sale.customer_cpf ? (
                                                <span className="font-medium text-gray-900">CPF: {detailsModal.sale.customer_cpf}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Consumidor Final</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* ... Resto do código de detalhes ... */}
                                {/* Itens */}
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Package size={18} className="text-brand-yellow" /> Itens do Pedido
                                    </h3>
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3">Produto</th>
                                                    <th className="px-4 py-3 text-right">Qtd</th>
                                                    <th className="px-4 py-3 text-right">Unitário</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {detailsModal.sale.items.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-3 font-medium text-gray-800">{item.name || item.product_name}</td>
                                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                                                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500">Detalhes não encontrados.</p>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-2xl">
                        <Button variant="secondary" onClick={() => setDetailsModal({ ...detailsModal, open: false })}>
                            Fechar
                        </Button>
                        <Button onClick={() => handlePrint(detailsModal.sale)} disabled={!detailsModal.sale}>
                            <Printer size={18} /> Imprimir Cupom
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
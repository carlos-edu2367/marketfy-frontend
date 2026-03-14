import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../hooks/useSync';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import PaymentModal from '../../components/pdv/PaymentModal';
import TerminalSelector from '../../components/pdv/TerminalSelector';
// Importação ajustada para pegar a função geradora
import { generateReceipt } from '../../components/pdv/Receipt';
import { 
  Search, ShoppingCart, LogOut, Wifi, WifiOff, Lock, 
  Store, Loader2, CreditCard, Monitor, Keyboard, Box, CheckCircle, Printer, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../../lib/utils';
import clsx from 'clsx';

const cleanUUID = (id) => {
    if (!id) return null;
    return id.toString().replace(/[^a-zA-Z0-9-]/g, '').trim();
};

const playBeep = () => { /* Placeholder */ };

export default function PDV() {
  const { marketId } = useParams();
  const navigate = useNavigate();
  const { syncSales, isOnline } = useSync();
  const { user } = useAuth();
  
  const searchInputRef = useRef(null);

  const [terminalId, setTerminalId] = useState(null);
  const [box, setBox] = useState(null);
  const [loadingBox, setLoadingBox] = useState(true);
  const [pendingCash, setPendingCash] = useState(0);
  
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0); 
  const [customerCpf, setCustomerCpf] = useState('');

  const [showPayment, setShowPayment] = useState(false);
  const [showCloseBoxModal, setShowCloseBoxModal] = useState(false);
  const [showOpenBoxModal, setShowOpenBoxModal] = useState(false);
  
  const [saleSuccess, setSaleSuccess] = useState({ open: false, change: 0, saleId: null });

  const [lastSale, setLastSale] = useState(null);
  const [marketInfo, setMarketInfo] = useState(null);
  const [printIsOffline, setPrintIsOffline] = useState(false);

  const [closingBalance, setClosingBalance] = useState('');
  const [closingObservation, setClosingObservation] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  useEffect(() => {
    const safeMarketId = cleanUUID(marketId);
    if (!safeMarketId) { navigate('/dashboard'); return; }
    const savedTerminal = localStorage.getItem(`terminal_${safeMarketId}`);
    if (savedTerminal && /^[0-9a-fA-F-]{36}$/.test(savedTerminal)) {
        setTerminalId(savedTerminal);
    } else {
        localStorage.removeItem(`terminal_${safeMarketId}`);
        setTerminalId(null);
        setLoadingBox(false);
    }
    api.get('/identity/markets').then(res => {
        const m = res.data.find(x => x.id === safeMarketId);
        if (m) setMarketInfo(m);
    }).catch(console.error);
  }, [marketId, navigate]);

  const checkBoxStatus = useCallback(async (isBackground = false) => {
      const safeMarketId = cleanUUID(marketId);
      const safeTerminalId = cleanUUID(terminalId);
      if (!safeMarketId || !safeTerminalId) return;
      try {
        if (!isBackground) setLoadingBox(true);
        const { data } = await api.get(`/sales/${safeMarketId}/terminals/${safeTerminalId}/box`);
        setBox(data);
      } catch (error) {
        if (error.response?.status === 404) setBox(null);
      } finally {
        if (!isBackground) setLoadingBox(false);
      }
  }, [marketId, terminalId]);

  const updatePendingCash = useCallback(async () => {
      if (!box) return;
      try {
          const pendingSales = await db.sales_queue.where({ status: 'pending' }).toArray();
          const totalCash = pendingSales
              .filter(s => s.box_id === box.id)
              .reduce((acc, sale) => {
                  return acc + sale.payments.filter(p => p.method === 'dinheiro').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
              }, 0);
          setPendingCash(totalCash);
      } catch (err) { console.error(err); }
  }, [box]);

  useEffect(() => { if (terminalId) checkBoxStatus(); }, [terminalId, checkBoxStatus]);
  useEffect(() => { updatePendingCash(); }, [box, updatePendingCash]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 1) { 
      setSearchResults([]); 
      setSelectedIndex(0); 
      return;
    }

    // Cria um atraso de 150ms. O leitor bipa mais rápido que isso, 
    // então a busca async só roda se o usuário digitar manualmente e pausar.
    const delaySearch = setTimeout(() => {
      const lower = searchTerm.toLowerCase();
      db.products.where('market_id').equals(marketId).toArray().then(prods => {
        const matches = prods.filter(p => 
          (p.barcode && p.barcode.includes(searchTerm)) || 
          (p.code && p.code.toLowerCase().includes(lower)) || 
          p.name.toLowerCase().includes(lower)
        ).slice(0, 8);
        setSearchResults(matches); 
        setSelectedIndex(0);
      });
    }, 150);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, marketId]);

  const addToCart = (product) => {
    playBeep();
    const price = Number(product.price || 0);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price } : item);
      }
      return [...prev, { ...product, price: price, quantity: 1, total: price }];
    });
    setSearchTerm(''); setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    searchInputRef.current?.focus();
  };

  const clearCart = () => {
      if (window.confirm("Limpar carrinho atual?")) {
          setCart([]); searchInputRef.current?.focus();
      }
  };

  const total = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.total) || 0), 0), [cart]);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (saleSuccess.open) {
            if (e.key === 'Enter') { e.preventDefault(); handlePrintAndClose(); } 
            else if (e.key === 'Escape') { e.preventDefault(); handleNewSale(); }
            return;
        }
        if (showPayment || showCloseBoxModal || showOpenBoxModal) {
            if (e.key === 'Escape') {
                setShowPayment(false); setShowCloseBoxModal(false); setShowOpenBoxModal(false);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
            return;
        }
        switch(e.key) {
            case 'F2': e.preventDefault(); if (cart.length > 0 && box) setShowPayment(true); else if (!box) toast.error("Abra o caixa primeiro!"); break;
            case 'F4': e.preventDefault(); searchInputRef.current?.focus(); break;
            case 'F9': e.preventDefault(); if (box) setShowCloseBoxModal(true); else handleOpenBoxClick(); break;
            case 'Escape': e.preventDefault(); if (searchTerm) setSearchTerm(''); else if (cart.length > 0) clearCart(); break;
            case 'ArrowDown': if (searchResults.length > 0) { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % searchResults.length); } break;
            case 'ArrowUp': if (searchResults.length > 0) { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length); } break;
            //case 'Enter': if (searchResults.length > 0) { e.preventDefault(); addToCart(searchResults[selectedIndex]); } break;
            default: break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, box, showPayment, showCloseBoxModal, showOpenBoxModal, searchResults, selectedIndex, searchTerm, saleSuccess]);

  const handleFinishSale = async (payments) => {
    if (!box) return toast.error("Caixa fechado!");
    const salePayload = {
      id: uuidv4(),
      market_id: cleanUUID(marketId),
      box_id: box.id,
      terminal_id: cleanUUID(terminalId),
      total_amount: total,
      items: cart.map(item => ({ product_id: item.id, name: item.name, quantity: item.quantity, unit_price: item.price, total: item.total })),
      payments: payments,
      customer_cpf: payments.find(p => p.method === 'fiado')?.customer_cpf || customerCpf, 
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    try {
      await db.sales_queue.add(salePayload);
      let finalSale = salePayload;
      let fiscalSuccess = false;
      updatePendingCash();

      if (isOnline) {
          syncSales().then(async () => {
             checkBoxStatus(true);
             try {
                const { data: fiscalData } = await api.post(`/fiscal/${salePayload.market_id}/sales/${salePayload.id}/emit`);
                finalSale = { ...salePayload, invoice: fiscalData };
                setLastSale(finalSale);
                fiscalSuccess = true;
                toast.success("NFC-e Autorizada");
             } catch (err) { /* Silent fail */ }
          });
      }

      setLastSale(salePayload);
      setPrintIsOffline(!fiscalSuccess);
      const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
      const change = Math.max(0, totalPaid - total);

      setShowPayment(false);
      setSaleSuccess({ open: true, change, saleId: salePayload.id });
      setCart([]); setCustomerCpf('');
    } catch (error) {
      console.error(error); toast.error("Erro ao salvar venda.");
    }
  };

  const handlePrintAndClose = () => {
      // MODIFICAÇÃO: Chamada direta ao gerador de PDF
      if (lastSale) {
          generateReceipt(lastSale, marketInfo);
      }
      handleNewSale();
  };

  const handleNewSale = () => {
      setSaleSuccess({ open: false, change: 0, saleId: null });
      setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleOpenBoxClick = () => { setOpeningBalance(''); setShowOpenBoxModal(true); };
  const confirmOpenBox = async () => {
    try {
        const balance = parseFloat(openingBalance.replace(',', '.')) || 0;
        await api.post(`/sales/${cleanUUID(marketId)}/terminals/${cleanUUID(terminalId)}/box/open`, { initial_balance: balance });
        toast.success("Caixa Aberto!"); setShowOpenBoxModal(false); checkBoxStatus(); 
    } catch (error) { toast.error(error.response?.data?.detail || "Erro ao abrir caixa."); }
  };
  const handleCloseBox = async () => {
      try {
          await api.post(`/sales/${cleanUUID(marketId)}/terminals/${cleanUUID(terminalId)}/box/close`, {
              final_balance_reported: parseFloat(closingBalance.replace(',', '.')) || 0,
              closing_observation: closingObservation || ""
          });
          toast.success("Caixa Fechado!"); setShowCloseBoxModal(false); setBox(null);
      } catch (error) { toast.error(error.response?.data?.detail || "Erro ao fechar caixa."); }
  };

  // --- ADICIONADO: Controlador de Enter do Input (Scanner vs Busca) ---
  const handleSearchKeyDown = async (e) => {
    // Se não for Enter ou se modais estiverem abertos, ignora
    if (e.key !== 'Enter' || saleSuccess.open || showPayment || showCloseBoxModal || showOpenBoxModal) return;
    
    e.preventDefault();
    if (!searchTerm) return;

    // 1. MODO SCANNER: Só números (ex: código de barras ou código numérico interno)
    const isScannerMode = /^\d+$/.test(searchTerm);

    if (isScannerMode) {
        // Busca EXATA e direta no banco (muito mais rápido que toArray)
        const exactMatch = await db.products
            .where('market_id').equals(marketId)
            .filter(p => p.barcode === searchTerm || p.code === searchTerm)
            .first();

        if (exactMatch) {
            addToCart(exactMatch);
            return; // Termina a execução aqui
        }
    }

    // 2. MODO BUSCA MANUAL: Usa o fallback do searchResults
    if (searchResults.length > 0) {
        addToCart(searchResults[selectedIndex]);
    } else if (isScannerMode) {
        toast.error("Produto não encontrado no estoque.");
        setSearchTerm(''); // Limpa para o próximo bip não acumular
    }
  };

  if (loadingBox) return <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4"><Loader2 className="animate-spin text-brand-yellow" size={64} /><p className="text-gray-500 font-bold animate-pulse">Iniciando PDV...</p></div>;
  if (!terminalId) return <TerminalSelector marketId={marketId} onSelect={(id) => setTerminalId(cleanUUID(id))} />;

  

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans select-none">
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-[65%] h-full">
        <div className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-3 border border-gray-200">
            <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-red-50 hover:text-red-600 rounded-xl text-gray-400 transition-colors group"><LogOut size={22} className="group-hover:-translate-x-1 transition-transform" /></button>
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-yellow transition-colors" size={24} />
                <input 
                    ref={searchInputRef} 
                    className="w-full pl-14 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:border-brand-yellow focus:bg-white outline-none transition-all text-xl font-bold text-gray-800 placeholder:text-gray-300 placeholder:font-normal" 
                    placeholder="Buscar produto (F4)" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    onKeyDown={handleSearchKeyDown} // <--- ADICIONADO AQUI
                    autoFocus 
                    disabled={!box} 
                />
            </div>
            <div className={`px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-black border transition-colors ${isOnline ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}{isOnline ? 'ONLINE' : 'OFFLINE'}</div>
        </div>
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 overflow-y-auto border border-gray-200 relative">
            {!box && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-gray-400"><Lock size={64} className="mb-4 text-red-300" /><h2 className="text-2xl font-bold text-gray-600">Caixa Fechado</h2><p>Pressione <span className="font-bold bg-gray-200 px-2 py-0.5 rounded text-gray-600">F9</span> para abrir</p></div>}
            {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                    {searchResults.map((p, index) => (
                        <button key={p.id} onClick={() => addToCart(p)} className={clsx("flex flex-col items-start p-4 border rounded-xl transition-all text-left relative overflow-hidden group h-32 justify-between", index === selectedIndex ? "border-brand-yellow ring-2 ring-brand-yellow ring-offset-1 bg-yellow-50" : "border-gray-100 hover:border-brand-yellow hover:shadow-md bg-white")}>
                            <span className="font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-brand-dark">{p.name}</span>
                            <div className="w-full flex justify-between items-end mt-2"><span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{p.code}</span><span className="text-xl font-black text-green-700">{formatCurrency(p.price)}</span></div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 select-none"><Store size={80} className="mb-4 opacity-20" /><p className="text-xl font-medium">Bip ou digite para adicionar</p></div>
            )}
        </div>
      </div>

      <div className="w-[35%] bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20 h-full">
         <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shadow-md shrink-0">
            <div><p className="text-[10px] uppercase font-bold text-slate-400">Operador</p><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div><p className="font-bold truncate max-w-[150px]">{user?.name || 'Vendedor'}</p></div></div>
            <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-400">Terminal</p><p className="font-mono text-sm tracking-wider text-yellow-400">{localStorage.getItem(`terminal_name_${cleanUUID(marketId)}`) || 'PDV-01'}</p></div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 relative custom-scrollbar">
            {cart.length > 0 ? cart.map((item, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm animate-fade-in group">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full font-bold text-gray-500 text-xs mr-3">{i + 1}</div>
                        <div className="flex-1 min-w-0"><p className="font-bold text-gray-800 truncate text-sm">{item.name}</p><p className="text-xs text-gray-500 mt-0.5"><span className="font-bold text-gray-700">{item.quantity}x</span> {formatCurrency(item.price)}</p></div>
                        <div className="text-right pl-2"><p className="font-black text-gray-900 text-lg">{formatCurrency(item.total)}</p><button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 text-[10px] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">Remover</button></div>
                    </div>
                )) : <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300"><ShoppingCart size={64} className="mb-4 opacity-30" /><p className="font-medium">Carrinho vazio</p></div>}
         </div>
         <div className="p-6 bg-white border-t border-gray-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-end"><span className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-1">Total</span><span className="text-5xl font-black text-brand-dark tracking-tight">{formatCurrency(total)}</span></div>
            <div className="grid grid-cols-2 gap-3 h-16">
                {!box ? (
                    <Button onClick={handleOpenBoxClick} className="col-span-2 w-full h-full text-lg bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200"><Lock className="mr-2" /> ABRIR CAIXA (F9)</Button>
                ) : (
                    <>
                        <Button variant="secondary" className="h-full border-2 border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 font-bold rounded-xl text-xs sm:text-sm flex flex-col justify-center gap-0" onClick={() => { checkBoxStatus(true); updatePendingCash(); setShowCloseBoxModal(true); }}><span className="opacity-50 text-[10px]">F9</span><span>OPÇÕES / FECHAR</span></Button>
                        <Button className={`h-full text-lg font-black rounded-xl shadow-lg transition-all flex flex-col justify-center gap-0 ${cart.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand-yellow hover:bg-yellow-400 text-brand-dark shadow-yellow-200'}`} onClick={() => setShowPayment(true)} disabled={cart.length === 0}><span className="opacity-60 text-[10px] font-normal uppercase">Finalizar Venda</span><span className="flex items-center gap-2 text-xl">Pagar (F2) <CreditCard size={20} /></span></Button>
                    </>
                )}
            </div>
         </div>
      </div>

      {showPayment && <PaymentModal total={total} marketId={cleanUUID(marketId)} onCancel={() => setShowPayment(false)} onConfirm={handleFinishSale} />}

      {saleSuccess.open && (
        <div className="fixed inset-0 bg-brand-green/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-4 bg-green-500"></div>
                <div className="mx-auto w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200"><CheckCircle size={64} className="animate-pulse" /></div>
                <h2 className="text-4xl font-black text-gray-800 mb-2">Venda Realizada!</h2>
                <p className="text-gray-500 font-medium mb-8">Transação registrada com sucesso.</p>
                {saleSuccess.change > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 mb-8"><p className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-1">Troco</p><p className="text-5xl font-black text-blue-800">{formatCurrency(saleSuccess.change)}</p></div>
                )}
                <div className="grid grid-cols-1 gap-4">
                    <Button onClick={handlePrintAndClose} className="h-16 text-xl font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xl flex items-center justify-center gap-3"><Printer size={28} /> IMPRIMIR CUPOM (Enter)</Button>
                    <Button onClick={handleNewSale} variant="secondary" className="h-14 text-lg font-bold border-2 rounded-xl text-gray-500 hover:text-gray-800 hover:border-gray-400">Nova Venda (Esc)</Button>
                </div>
            </div>
        </div>
      )}

      {showOpenBoxModal && (
            <ModalOverlay title="Abrir Caixa" icon={Box} color="bg-green-600">
                <div className="space-y-4">
                    <div><label className="text-sm font-bold text-gray-700 mb-1 block">Fundo de Troco (R$)</label><Input type="number" step="0.01" placeholder="0.00" className="text-2xl font-bold h-14" autoFocus value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmOpenBox()} /></div>
                    <div className="flex gap-3 pt-4"><Button variant="secondary" className="flex-1 h-12" onClick={() => setShowOpenBoxModal(false)}>Cancelar</Button><Button variant="success" className="flex-1 h-12 font-bold" onClick={confirmOpenBox}>Confirmar</Button></div>
                </div>
            </ModalOverlay>
        )}
      {showCloseBoxModal && (
            <ModalOverlay title="Fechar Caixa" icon={Lock} color="bg-red-600">
                 <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center"><p className="text-xs text-gray-500 uppercase font-bold">Saldo Estimado</p><p className="text-3xl font-black text-gray-800 mt-1">{formatCurrency((Number(box?.current_balance) || 0) + pendingCash)}</p><p className="text-[10px] text-gray-400 mt-1">Server: {formatCurrency(Number(box?.current_balance) || 0)} | Pendente: {formatCurrency(pendingCash)}</p></div>
                        <div><label className="text-sm font-bold text-gray-700 mb-1 block">Saldo Real (Conferência)</label><Input type="number" step="0.01" placeholder="0.00" className="text-xl font-bold" autoFocus value={closingBalance} onChange={e => setClosingBalance(e.target.value)} /></div>
                        <div><label className="text-sm font-bold text-gray-700 mb-1 block">Observações</label><textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-yellow outline-none transition-all resize-none" rows="2" placeholder="Diferenças, quebras..." value={closingObservation} onChange={e => setClosingObservation(e.target.value)}></textarea></div>
                        <div className="flex gap-3 pt-2"><Button variant="secondary" className="flex-1 h-12" onClick={() => setShowCloseBoxModal(false)}>Voltar</Button><Button variant="danger" className="flex-1 h-12 font-bold" onClick={handleCloseBox}>Fechar Caixa</Button></div>
                    </div>
            </ModalOverlay>
        )}
    </div>
  );
}

function ModalOverlay({ children, title, icon: Icon, color }) {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className={`${color} p-6 text-white text-center`}><Icon className="mx-auto mb-2 opacity-90" size={32} /><h2 className="text-2xl font-bold tracking-tight">{title}</h2></div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
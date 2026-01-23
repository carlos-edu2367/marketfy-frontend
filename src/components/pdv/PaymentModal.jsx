import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import { CreditCard, Banknote, X, Check, DollarSign, Users, Search, Loader2, QrCode, UserCheck } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function PaymentModal({ total, onConfirm, onCancel, marketId }) {
  const [payments, setPayments] = useState([]);
  const [currentAmount, setCurrentAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('dinheiro');
  
  // --- ESTADOS PARA GESTÃO DE CLIENTES (FIADO) ---
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const customerInputRef = useRef(null);
  const amountInputRef = useRef(null);

  // Totais já confirmados
  const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + parseFloat(p.amount), 0), [payments]);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  // Preenche o valor restante automaticamente
  useEffect(() => {
    if (remaining > 0) {
        setCurrentAmount(remaining.toFixed(2));
    } else {
        setCurrentAmount('');
    }
  }, [remaining, payments]);

  // Foca no input de cliente ao selecionar Fiado
  useEffect(() => {
    if (selectedMethod === 'fiado') {
        if (!selectedCustomer) {
            setTimeout(() => customerInputRef.current?.focus(), 100);
        }
    } else {
        setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [selectedMethod, selectedCustomer]);

  // Foca no valor quando um cliente é selecionado
  useEffect(() => {
    if (selectedMethod === 'fiado' && selectedCustomer) {
        setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [selectedCustomer, selectedMethod]);

  // Busca Clientes para Fiado (Debounce)
  useEffect(() => {
    if (selectedMethod === 'fiado') {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setLoadingCustomers(true);
                try {
                    const { data } = await api.get(`/finance/${marketId}/customers?search=${searchTerm}`);
                    setCustomers(data);
                } catch (error) {
                    console.error("Erro ao buscar clientes", error);
                } finally {
                    setLoadingCustomers(false);
                }
            } else {
                setCustomers([]);
            }
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, selectedMethod, marketId]);

  const handleAddPayment = () => {
    const amount = parseFloat(currentAmount.replace(',', '.'));
    if (!amount || amount <= 0) return toast.error("Valor inválido");
    if (amount > remaining && selectedMethod !== 'dinheiro') return toast.error("Valor superior ao restante!");

    // Validação Fiado
    if (selectedMethod === 'fiado' && !selectedCustomer) {
        return toast.error("Selecione um cliente para vender fiado.");
    }

    setPayments([...payments, { 
        method: selectedMethod, 
        amount: amount.toFixed(2),
        // CORREÇÃO: Armazena o CPF e Nome dentro do item de pagamento
        details: selectedMethod === 'fiado' ? selectedCustomer.name : null,
        cpf: selectedMethod === 'fiado' ? selectedCustomer.cpf : null 
    }]);
    setCurrentAmount('');
    
    // Reseta cliente e volta para dinheiro (fluxo comum)
    if (selectedMethod === 'fiado') {
        setSearchTerm('');
        setSelectedCustomer(null);
        setSelectedMethod('dinheiro'); 
    }
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleFinalize = () => {
      if (remaining > 0.01) return toast.error("Ainda há valor pendente!");
      
      // CORREÇÃO: Recupera o cliente a partir dos pagamentos lançados
      // Se houver qualquer pagamento 'fiado', usamos o CPF salvo nele.
      const fiadoPayment = payments.find(p => p.method === 'fiado');
      
      let finalCustomer = selectedCustomer; // Tenta o selecionado atual (se houver)
      
      // Se não tiver selecionado agora, mas tiver um fiado na lista, usa o do fiado
      if (!finalCustomer && fiadoPayment) {
          finalCustomer = { 
              name: fiadoPayment.details, 
              cpf: fiadoPayment.cpf 
          };
      }

      onConfirm(payments, finalCustomer);
  };

  const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
          if (document.activeElement.tagName === 'INPUT' && remaining > 0) {
              if (selectedMethod === 'fiado' && !selectedCustomer) return;
              handleAddPayment();
          } 
          else if (remaining <= 0.01) {
              handleFinalize();
          }
      }
      if (e.key === 'Escape') {
          onCancel();
      }
  };

  // --- LÓGICA DE STATUS DO CLIENTE ---
  const isCustomerOk = (c) => {
      if (!c.status) return true; 
      const s = c.status.toLowerCase();
      return ['ok', 'ativo', 'active', 'liberado', 'regular'].includes(s);
  };

  const selectCustomer = (c) => {
      if (!isCustomerOk(c)) {
          toast.error(`Cliente bloqueado! Status: ${c.status}`);
          return;
      }
      setSelectedCustomer(c);
      setSearchTerm(c.name);
      setCustomers([]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onKeyDown={handleKeyDown}>
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* LADO ESQUERDO: Métodos e Seleção */}
        <div className="w-full md:w-7/12 bg-gray-50 p-6 flex flex-col border-r border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <CreditCard className="text-brand-yellow" size={28} /> Pagamento
                </h2>
                <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                    <X size={24} />
                </button>
            </div>

            {/* Grid de Métodos */}
            <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
                {[
                    { id: 'dinheiro', icon: Banknote, label: 'Dinheiro' },
                    { id: 'cartao_credito', icon: CreditCard, label: 'Crédito' },
                    { id: 'cartao_debito', icon: CreditCard, label: 'Débito' },
                    { id: 'pix', icon: QrCode, label: 'PIX' },
                    { id: 'fiado', icon: Users, label: 'Fiado (Prazo)' },
                ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setSelectedMethod(m.id)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all font-bold text-sm h-24 ${
                            selectedMethod === m.id 
                            ? 'border-brand-yellow bg-yellow-50 text-brand-dark shadow-md scale-[1.02] ring-2 ring-yellow-200 ring-offset-1' 
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        <m.icon size={24} className="mb-1" />
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Área Dinâmica: Input Valor ou Seleção de Cliente */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                
                {/* Seletor de Cliente */}
                {selectedMethod === 'fiado' && (
                    <div className="flex-1 bg-white rounded-2xl border-2 border-orange-100 p-4 shadow-sm flex flex-col animate-fade-in relative overflow-hidden min-h-0">
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-300"></div>
                        <h3 className="text-orange-600 font-bold flex items-center gap-2 mb-3 shrink-0">
                            <Users size={18} /> Selecionar Cliente
                        </h3>
                        
                        {!selectedCustomer ? (
                            <>
                                <div className="relative mb-3 shrink-0">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input 
                                        ref={customerInputRef}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="Digite o nome (min. 2 letras)..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                                
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                    {loadingCustomers ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-orange-400">
                                            <Loader2 className="animate-spin mb-2" size={32} />
                                            <p className="text-sm font-bold">Buscando...</p>
                                        </div>
                                    ) : customers.length > 0 ? (
                                        customers.map(c => {
                                            const isOk = isCustomerOk(c);
                                            return (
                                                <button 
                                                    key={c.id} 
                                                    onClick={() => selectCustomer(c)}
                                                    className={`w-full text-left p-4 rounded-xl border flex justify-between items-center transition-all ${
                                                        isOk 
                                                        ? 'bg-white border-gray-100 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md' 
                                                        : 'bg-red-50 border-red-100 opacity-80 cursor-not-allowed hover:bg-red-100'
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-lg">{c.name}</p>
                                                        <p className="text-xs text-gray-500">CPF: {c.cpf || 'Não informado'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs px-3 py-1 rounded-full font-bold inline-block ${
                                                            isOk ? 'bg-green-100 text-green-700' : 'bg-red-200 text-red-800'
                                                        }`}>
                                                            {isOk ? 'LIBERADO' : 'BLOQUEADO'}
                                                        </span>
                                                        {!isOk && (
                                                            <p className="text-[10px] text-red-600 mt-1 uppercase font-bold">{c.status}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : searchTerm.length >= 2 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <Users size={48} className="mx-auto mb-2 opacity-20" />
                                            <p>Nenhum cliente encontrado.</p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-300">
                                            <Search size={48} className="mx-auto mb-2 opacity-20" />
                                            <p>Pesquise para selecionar.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center bg-green-50 rounded-xl border border-green-200 p-6 animate-fade-in">
                                <UserCheck size={48} className="text-green-500 mb-2" />
                                <h4 className="text-xl font-bold text-green-800">{selectedCustomer.name}</h4>
                                <p className="text-green-600 mb-6">Cliente Selecionado</p>
                                <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>
                                    <X size={16} /> Trocar Cliente
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Input de Valor */}
                {(selectedMethod !== 'fiado' || selectedCustomer) && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-auto shrink-0 animate-fade-in">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                            Valor a Lançar ({selectedMethod === 'fiado' ? 'Na Conta' : 'Receber'})
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">R$</span>
                                <input 
                                    ref={amountInputRef}
                                    type="number"
                                    className="w-full pl-12 pr-4 py-3 text-4xl font-black text-gray-800 outline-none bg-gray-50 rounded-xl border-2 border-transparent focus:border-brand-yellow focus:bg-white transition-all"
                                    placeholder="0.00"
                                    value={currentAmount}
                                    onChange={e => setCurrentAmount(e.target.value)}
                                />
                            </div>
                            <Button 
                                onClick={handleAddPayment} 
                                disabled={!currentAmount || (selectedMethod === 'fiado' && !selectedCustomer)}
                                className="w-24 rounded-xl"
                                size="xl"
                            >
                                <Check size={32} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* LADO DIREITO: Resumo */}
        <div className="w-full md:w-5/12 p-8 flex flex-col bg-white overflow-hidden">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 shrink-0">Resumo da Venda</h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 custom-scrollbar pr-2 min-h-0">
                {payments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <DollarSign size={64} className="mb-4 opacity-20" />
                        <p className="font-medium text-lg">Aguardando Pagamento</p>
                    </div>
                ) : (
                    payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg shadow-sm text-white ${p.method === 'fiado' ? 'bg-orange-500' : 'bg-brand-dark'}`}>
                                    {p.method === 'fiado' ? <Users size={18} /> : <DollarSign size={18} />}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 capitalize text-lg">{p.method.replace('_', ' ')}</p>
                                    <p className="text-sm text-gray-500 font-medium">
                                        {formatCurrency(p.amount)}
                                        {p.details && <span className="text-xs ml-1 text-orange-600">({p.details})</span>}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-auto space-y-4 shrink-0">
                <div className="space-y-2 pb-4 border-b border-gray-100">
                    <div className="flex justify-between text-lg text-gray-500">
                        <span>Total Venda:</span>
                        <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-lg text-green-600">
                        <span>Total Pago:</span>
                        <span className="font-bold">{formatCurrency(totalPaid)}</span>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <span className="text-gray-500 font-bold uppercase text-sm mb-1">Falta Pagar</span>
                    <span className={`text-4xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-gray-300'}`}>
                        {formatCurrency(remaining)}
                    </span>
                </div>
                
                {change > 0 && (
                    <div className="flex justify-between items-center bg-blue-50 p-5 rounded-2xl border border-blue-100 animate-pulse">
                        <span className="text-blue-800 font-bold text-lg">TROCO:</span>
                        <span className="font-black text-blue-800 text-3xl">{formatCurrency(change)}</span>
                    </div>
                )}
                
                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" className="flex-1 h-14 text-lg font-bold rounded-xl border-2" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="success" 
                        className="flex-[2] h-14 text-xl font-black shadow-lg shadow-green-200 rounded-xl" 
                        onClick={handleFinalize}
                        disabled={remaining > 0.01}
                    >
                        <Check size={28} /> CONCLUIR
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
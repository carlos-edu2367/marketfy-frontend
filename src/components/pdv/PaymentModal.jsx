import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import { CreditCard, Banknote, Check, DollarSign, Users, QrCode, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomerSelectorModal from './CustomerSelectorModal';

export default function PaymentModal({ total, onConfirm, onCancel, marketId }) {
  const [payments, setPayments] = useState([]);
  const [currentAmount, setCurrentAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('dinheiro');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);

  const amountInputRef = useRef(null);

  // Totais calculados
  const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + parseFloat(p.amount), 0), [payments]);
  const remaining = Math.max(0, total - totalPaid);

  // Preenche o valor restante automaticamente
  useEffect(() => {
    if (remaining > 0) {
        setCurrentAmount(remaining.toFixed(2));
    } else {
        setCurrentAmount('');
    }
  }, [remaining, payments.length]);

  // Foca no input
  useEffect(() => {
    if (amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.select();
    }
  }, [selectedMethod]);

  const getAvailableCredit = (customer) => Math.max(
      0,
      Number(customer?.credit_limit || 0) - Number(customer?.current_debt || 0)
  );

  const selectPaymentMethod = (method) => {
      setSelectedMethod(method);
      if (method === 'fiado' && !selectedCustomer) {
          setShowCustomerSelector(true);
      }
  };

  const handleCustomerSelect = (customer) => {
      setSelectedCustomer(customer);
      setShowCustomerSelector(false);
  };

  const handleAddPayment = () => {
      const amount = parseFloat(currentAmount);
      
      if (!amount || amount <= 0) return toast.error("Digite um valor válido.");
      if (amount > remaining + 0.01 && selectedMethod !== 'dinheiro') return toast.error("Valor superior ao restante.");

      let finalCustomer = null;
      if (selectedMethod === 'fiado') {
          if (!selectedCustomer) return toast.error("Selecione um cliente para o Fiado.");
          
          const available = getAvailableCredit(selectedCustomer);

          if (amount > available) return toast.error(`Limite insuficiente! Disponível: ${formatCurrency(available)}`);
          finalCustomer = selectedCustomer;
      }

      setPayments([...payments, {
          method: selectedMethod,
          amount: amount,
          customer_id: finalCustomer?.id,
          customer_name: finalCustomer?.name,
          customer_cpf: finalCustomer?.cpf 
      }]);

      if (remaining - amount > 0) {
          setSelectedCustomer(null);
      }
  };

  const removePayment = (index) => {
      const newPayments = [...payments];
      newPayments.splice(index, 1);
      setPayments(newPayments);
  };

  const handleFinalize = async () => {
      setIsProcessing(true);
      try {
          // Apenas envia os dados para o Pdv.jsx e aguarda.
          // O Pdv.jsx será responsável por fechar este modal e mostrar a tela de sucesso.
          await onConfirm(payments);
      } catch (error) {
          console.error(error);
          toast.error("Erro ao processar pagamentos.");
          setIsProcessing(false); // Destrava apenas em caso de erro
      }
  };

  const renderCreditInfo = () => {
      if (!selectedCustomer) return null;
      const limit = parseFloat(selectedCustomer.credit_limit || 0);
      const debt = parseFloat(selectedCustomer.current_debt || 0);
      const available = getAvailableCredit(selectedCustomer);
      const amount = parseFloat(currentAmount || 0);
      const willExceed = amount > available;
      const percentUsed = limit > 0 ? (debt / limit) * 100 : 0;

      return (
          <div className={`mt-2 p-3 rounded-lg border ${willExceed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">{selectedCustomer.name}</span>
                  <button onClick={() => { setSelectedCustomer(null); setShowCustomerSelector(true); }} className="text-xs text-red-500 hover:underline">Alterar</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center mb-2">
                  <div className="bg-white p-1 rounded border border-gray-100">
                      <p className="text-gray-500">Limite</p>
                      <p className="font-bold">{formatCurrency(limit)}</p>
                  </div>
                  <div className="bg-white p-1 rounded border border-gray-100">
                      <p className="text-gray-500">Dívida</p>
                      <p className="font-bold text-red-500">{formatCurrency(debt)}</p>
                  </div>
                  <div className={`bg-white p-1 rounded border ${willExceed ? 'border-red-300 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <p className="text-gray-500">Disponível</p>
                      <p className={`font-bold ${willExceed ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(available)}</p>
                  </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
              </div>
              {willExceed && (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-bold mt-1">
                      <AlertCircle size={12} /> Excede o limite!
                  </div>
              )}
          </div>
      );
  };

  const methods = [
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-green-600' },
    { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'text-blue-600' },
    { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'text-sky-600' },
    { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-teal-600' },
    { id: 'fiado', label: 'Fiado (Crédito)', icon: Users, color: 'text-orange-600' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* LADO ESQUERDO */}
        <div className="flex-1 p-6 flex flex-col border-r border-gray-100 bg-gray-50/50">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Pagamento</h2>
                <p className="text-gray-500 text-sm">Selecione a forma de pagamento.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {methods.map(m => (
                    <button
                        key={m.id}
                        onClick={() => selectPaymentMethod(m.id)}
                        disabled={isProcessing}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                            selectedMethod === m.id 
                            ? 'border-brand-yellow bg-yellow-50 shadow-md scale-105 z-10' 
                            : 'border-white bg-white hover:border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
                        }`}
                    >
                        <m.icon size={24} className={selectedMethod === m.id ? 'text-gray-900' : m.color} />
                        <span className={`font-bold text-sm ${selectedMethod === m.id ? 'text-gray-900' : 'text-gray-500'}`}>{m.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Valor</label>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-medium text-gray-400">R$</span>
                    <input 
                        ref={amountInputRef}
                        type="number"
                        value={currentAmount}
                        onChange={e => setCurrentAmount(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddPayment()}
                        disabled={isProcessing}
                        className="w-full text-5xl font-black text-gray-900 outline-none bg-transparent placeholder:text-gray-200"
                        placeholder="0.00"
                        autoFocus
                    />
                </div>
            </div>

            {selectedMethod === 'fiado' && (
                <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm relative animate-fade-in">
                    {!selectedCustomer ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                            onClick={() => setShowCustomerSelector(true)}
                            disabled={isProcessing}
                        >
                            Selecionar cliente
                        </Button>
                    ) : ( renderCreditInfo() )}
                </div>
            )}

            <Button size="lg" className="mt-auto w-full font-bold h-14 text-lg" onClick={handleAddPayment} disabled={isProcessing}>
                Adicionar Pagamento <Check size={20} />
            </Button>
        </div>

        {/* LADO DIREITO */}
        <div className="w-full md:w-96 bg-slate-900 text-white p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><DollarSign size={200} /></div>

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Resumo</h3>
                    <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-300">{payments.length} Pagamentos</div>
                </div>
                <div className="mb-8">
                    <p className="text-slate-400 text-sm mb-1">Total Geral</p>
                    <p className="text-4xl font-black text-white">{formatCurrency(total)}</p>
                </div>
                <div className="space-y-2 mb-6 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                    {payments.map((p, i) => (
                        <div key={i} className="bg-slate-800/50 p-3 rounded-xl flex justify-between items-center border border-slate-700/50">
                            <div>
                                <p className="font-bold text-sm text-slate-200 flex items-center gap-2">
                                    {p.method.replace('_', ' ').toUpperCase()}
                                </p>
                                {p.customer_name && <p className="text-[10px] text-orange-300">{p.customer_name}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-lg">{formatCurrency(p.amount)}</span>
                                <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-300" disabled={isProcessing}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative z-10 bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Total Pago</span>
                    <span className="font-bold text-green-400">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-500 font-bold uppercase text-sm mb-1">Falta</span>
                    <span className={`text-4xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-gray-300'}`}>{formatCurrency(remaining)}</span>
                </div>
                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" className="flex-1 h-14 text-lg font-bold rounded-xl border-2 bg-transparent text-white border-slate-600 hover:bg-slate-700" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
                    <Button 
                        variant="success" 
                        className="flex-[2] h-14 text-xl font-black shadow-lg shadow-green-900/50 rounded-xl" 
                        onClick={handleFinalize}
                        disabled={remaining > 0.01 || isProcessing}
                        isLoading={isProcessing}
                    >
                        <Check size={28} /> CONCLUIR
                    </Button>
                </div>
            </div>
        </div>
      </div>
      {showCustomerSelector && (
        <CustomerSelectorModal
          marketId={marketId}
          onSelect={handleCustomerSelect}
          onClose={() => setShowCustomerSelector(false)}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  UserPlus, Users, DollarSign,
  FileText, ArrowDownCircle, ArrowUpCircle, X, Loader2, Store, Check 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState(""); 
  
  // Modais
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ open: false, customer: null });
  
  // Estado do Extrato: Agora armazena o cliente E os lançamentos separados
  const [ledgerState, setLedgerState] = useState({ open: false, customer: null, transactions: [], loading: false });
  
  const { register, handleSubmit, reset } = useForm();
  const { register: registerPay, handleSubmit: handleSubmitPay, reset: resetPay } = useForm();

  // Função auxiliar para verificar status (Flexível)
  const isCustomerActive = (status) => {
      if (!status) return true; // Default to active if undefined
      const s = String(status).toLowerCase();
      return ['ok', 'ativo', 'active', 'liberado', 'regular'].includes(s);
  };

  // Função de carregamento memorizada
  const loadCustomers = useCallback(async () => {
    if (!selectedMarketId) return;
    try {
        setLoading(true);
        const { data } = await api.get(`/finance/${selectedMarketId}/customers`);
        setCustomers(data);
    } catch (error) {
        console.error("Erro ao carregar clientes", error);
        toast.error("Erro ao carregar lista de clientes.");
    } finally {
        setLoading(false);
    }
  }, [selectedMarketId]);

  // Carrega lojas e seleciona a primeira
  useEffect(() => {
      async function init() {
          try {
              const { data } = await api.get('/identity/markets');
              setMarkets(data);
              if (data.length > 0) setSelectedMarketId(data[0].id);
          } catch (error) {
              console.error(error);
          }
      }
      init();
  }, []);

  // Carrega clientes quando a loja muda
  useEffect(() => {
      loadCustomers();
  }, [loadCustomers]);

  const handleRegister = async (data) => {
      try {
          await api.post(`/finance/${selectedMarketId}/customers`, data);
          toast.success("Cliente cadastrado!");
          setShowRegisterModal(false);
          reset();
          loadCustomers();
      } catch (error) {
          toast.error(error.response?.data?.detail || "Erro ao cadastrar.");
      }
  };

  const handleRegisterPayment = async (data) => {
      if (!paymentModal.customer) return;
      
      try {
          // Converte valor string (ex: "50,00") para float (50.00)
          const amount = parseFloat(data.amount.replace(',', '.'));
          if (isNaN(amount) || amount <= 0) {
              toast.error("Valor inválido.");
              return;
          }

          const payload = {
              amount: amount,
              description: data.description || "Amortização de Dívida"
          };

          await api.post(`/finance/${selectedMarketId}/customers/${paymentModal.customer.id}/payment`, payload);
          
          toast.success("Pagamento registrado com sucesso!");
          setPaymentModal({ open: false, customer: null });
          resetPay();
          loadCustomers(); // Atualiza saldos na lista
          
          // Se o extrato deste cliente estiver aberto, atualiza também
          if (ledgerState.open && ledgerState.customer?.id === paymentModal.customer.id) {
              openLedger(ledgerState.customer);
          }
      } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.detail || "Erro ao registrar pagamento.");
      }
  };

  const openLedger = async (customer) => {
      setLedgerState({ open: true, customer, transactions: [], loading: true });
      try {
          const { data } = await api.get(`/finance/${selectedMarketId}/customers/${customer.id}/ledger`);
          setLedgerState(prev => ({ ...prev, transactions: data, loading: false }));
      } catch (error) {
          toast.error("Erro ao carregar extrato.");
          setLedgerState(prev => ({ ...prev, loading: false }));
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Users className="text-brand-yellow" /> Gestão de Clientes
                </h1>
                <p className="text-gray-500">Controle de fiado, limites e histórico de compras.</p>
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
                <Button onClick={() => setShowRegisterModal(true)}>
                    <UserPlus size={18} /> Novo Cliente
                </Button>
            </div>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-yellow" size={40} /></div>
            ) : customers.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum cliente cadastrado nesta loja.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {customers.map(c => {
                        const active = isCustomerActive(c.status);
                        return (
                            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${active ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900">{c.name}</p>
                                            {!active && (
                                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                                                    Bloqueado
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                            <span>{c.phone || 'Sem telefone'}</span>
                                            {c.cpf && <span>• CPF: {c.cpf}</span>}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dívida Atual</p>
                                        <p className={`font-black text-lg ${c.current_debt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {formatCurrency(c.current_debt)}
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {c.current_debt > 0 && (
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700 text-white border-none shadow-sm" 
                                                onClick={() => setPaymentModal({ open: true, customer: c })}
                                            >
                                                <DollarSign size={16} /> Pagar
                                            </Button>
                                        )}
                                        <Button size="sm" variant="secondary" onClick={() => openLedger(c)}>
                                            <FileText size={16} /> Extrato
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Modal de Cadastro */}
        {showRegisterModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Novo Cliente</h2>
                        <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                    </div>
                    <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                        <Input label="Nome Completo" placeholder="Ex: Maria Silva" {...register('name', { required: true })} />
                        <Input label="CPF (Opcional)" placeholder="000.000.000-00" {...register('cpf')} />
                        <Input label="Telefone / WhatsApp" placeholder="(00) 00000-0000" {...register('phone')} />
                        <div className="pt-2 flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowRegisterModal(false)}>Cancelar</Button>
                            <Button type="submit" variant="primary" className="flex-1">Cadastrar</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal de Pagamento de Dívida */}
        {paymentModal.open && paymentModal.customer && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <DollarSign className="text-green-600" /> Receber Dívida
                        </h2>
                        <button onClick={() => setPaymentModal({ open: false, customer: null })} className="text-gray-400 hover:text-gray-600"><X /></button>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Cliente</p>
                        <p className="font-bold text-lg text-gray-900">{paymentModal.customer.name}</p>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Dívida Total</span>
                            <span className="font-black text-red-600 text-xl">{formatCurrency(paymentModal.customer.current_debt)}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitPay(handleRegisterPayment)} className="space-y-4">
                        <Input 
                            label="Valor do Pagamento (R$)" 
                            placeholder="0,00" 
                            className="text-lg font-bold"
                            {...registerPay('amount', { required: true })} 
                            autoFocus
                        />
                        <Input 
                            label="Descrição / Observação" 
                            placeholder="Ex: Pagamento parcial em dinheiro" 
                            {...registerPay('description')} 
                        />
                        <div className="pt-2 flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setPaymentModal({ open: false, customer: null })}>Cancelar</Button>
                            <Button type="submit" variant="success" className="flex-1 font-bold">
                                <Check size={18} /> Confirmar
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal de Extrato (Ledger) */}
        {ledgerState.open && ledgerState.customer && (
            <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-end animate-fade-in">
                <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl animate-slide-in-right">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{ledgerState.customer.name}</h2>
                            <p className="text-sm text-gray-500">Histórico de Compras e Pagamentos</p>
                        </div>
                        <button onClick={() => setLedgerState({ ...ledgerState, open: false })} className="p-2 hover:bg-gray-200 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {ledgerState.loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : ledgerState.transactions.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Nenhuma movimentação registrada.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {ledgerState.transactions.map(entry => (
                                    <div key={entry.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${entry.type === 'divida' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                {entry.type === 'divida' ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{entry.description || (entry.type === 'divida' ? 'Compra Fiado' : 'Pagamento')}</p>
                                                <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
                                            </div>
                                        </div>
                                        <span className={`text-base font-bold ${entry.type === 'divida' ? 'text-red-600' : 'text-green-600'}`}>
                                            {entry.type === 'divida' ? '-' : '+'} {formatCurrency(entry.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 border-t border-gray-100 bg-white">
                         <div className="flex justify-between items-center bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                             <span className="text-red-800 font-bold uppercase text-xs">Saldo Devedor Total</span>
                             <span className="text-2xl font-black text-red-600">{formatCurrency(ledgerState.customer.current_debt)}</span>
                         </div>
                         <Button className="w-full h-12 text-lg font-bold" onClick={() => setLedgerState({...ledgerState, open: false})}>
                             Fechar Extrato
                         </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
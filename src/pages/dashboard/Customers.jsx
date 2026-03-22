import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom'; // Importado para navegação
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  UserPlus, Users, DollarSign,
  FileText, ArrowDownCircle, ArrowUpCircle, X, Loader2, Store, Search, CreditCard, Banknote, QrCode,
  ShoppingCart, CheckCircle, ExternalLink // Ícones adicionados
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function Customers() {
  const navigate = useNavigate(); // Hook de navegação
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState(""); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modais
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ open: false, customer: null });
  
  // Estado do Extrato
  const [ledgerState, setLedgerState] = useState({ open: false, customer: null, transactions: [], loading: false });

  // Estado de loading do pagamento
  const [paymentLoading, setPaymentLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm();
  
  // Form do Pagamento (adicionado payment_method)
  const { register: registerPay, handleSubmit: handleSubmitPay, reset: resetPay } = useForm({
      defaultValues: { payment_method: 'dinheiro' }
  });

  // 1. Carrega Lojas
  useEffect(() => {
    async function loadMarkets() {
      try {
        const { data } = await api.get('/identity/markets');
        setMarkets(data);
        if (data.length > 0) setSelectedMarketId(data[0].id);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar lojas.");
      }
    }
    loadMarkets();
  }, []);

  // 2. Carrega Clientes
  const loadCustomers = useCallback(async () => {
    if (!selectedMarketId) return;
    try {
      setLoading(true);
      const params = searchTerm ? { search: searchTerm } : {};
      
      const { data } = await api.get(`/finance/${selectedMarketId}/customers`, { params });
      setCustomers(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [selectedMarketId, searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        loadCustomers();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [loadCustomers]);

  // 3. Criar Cliente
  const handleRegister = async (data) => {
    try {
      const payload = {
          name: data.name,
          cpf: data.cpf || null,
          phone: data.phone || null,
          email: data.email || null,
          credit_limit: parseFloat(data.credit_limit) // Obrigatório conforme doc
      };

      await api.post(`/finance/${selectedMarketId}/customers`, payload);
      
      toast.success("Cliente cadastrado com sucesso!");
      setShowRegisterModal(false);
      reset();
      loadCustomers();
    } catch (error) {
      const msg = error.response?.data?.detail || "Erro ao cadastrar cliente.";
      toast.error(msg);
    }
  };

  // 4. Receber Pagamento (Baixar Dívida)
  const handlePayment = async (data) => {
      if (!paymentModal.customer) return;
      try {
          setPaymentLoading(true);
          const payload = {
              amount: parseFloat(data.amount),
              payment_method: data.payment_method, // Obrigatório: dinheiro, pix, cartao_debito
              description: data.description || "Pagamento Avulso"
          };

          await api.post(`/finance/${selectedMarketId}/customers/${paymentModal.customer.id}/payment`, payload);

          toast.success("Pagamento registrado!");
          setPaymentModal({ open: false, customer: null });
          resetPay();
          loadCustomers();

          // Se extrato estiver aberto, atualiza
          if (ledgerState.open && ledgerState.customer?.id === paymentModal.customer.id) {
              openLedger(paymentModal.customer);
          }
      } catch (error) {
          console.error(error);
          toast.error("Erro ao registrar pagamento.");
      } finally {
          setPaymentLoading(false);
      }
  };

  // 5. Carregar Extrato (Atualizado para rota /ledger)
  const openLedger = async (customer) => {
      setLedgerState({ open: true, customer, transactions: [], loading: true });
      try {
          // ROTA CORRIGIDA PARA /ledger
          const { data } = await api.get(`/finance/${selectedMarketId}/customers/${customer.id}/ledger`);
          
          // Garante ordenação cronológica (Antiga -> Recente) para cálculo correto
          const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));

          // Cálculo do Saldo Progressivo
          let saldo = 0;
          const statementWithBalance = sortedData.map(entry => {
              const amount = parseFloat(entry.amount);
              if (entry.type === 'divida') {
                  saldo += amount;
              } else { // pagamento
                  saldo -= amount;
              }
              // Ajusta saldo negativo para 0 se necessário, ou mantém negativo se permitir crédito
              return { ...entry, current_balance: saldo };
          });

          // Opcional: Inverter para exibir o mais recente no topo, se preferir
          // statementWithBalance.reverse();

          setLedgerState({ open: true, customer, transactions: statementWithBalance, loading: false });
      } catch (error) {
          console.error(error);
          toast.error("Erro ao carregar extrato.");
          setLedgerState(prev => ({ ...prev, loading: false }));
      }
  };

  // Navegar para detalhes da venda
  const goToSale = (saleId) => {
      if (!saleId) return;
      navigate(`/sales/${selectedMarketId}/${saleId}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Users className="text-brand-yellow" /> Gestão de Clientes
                </h1>
                <p className="text-gray-500">Controle de limites e pagamentos de fiado.</p>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
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

        {/* BUSCA */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-6 shadow-sm flex items-center gap-4 focus-within:ring-2 focus-within:ring-brand-yellow/50">
            <Search className="text-gray-400" />
            <input 
                placeholder="Buscar por nome ou CPF..." 
                className="flex-1 outline-none text-gray-700 font-medium placeholder:font-normal"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* LISTA DE CLIENTES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-yellow" size={40} /></div>
            ) : customers.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum cliente encontrado.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {customers.map(c => {
                        const limit = parseFloat(c.credit_limit || 0);
                        const debt = parseFloat(c.current_debt || 0);
                        const available = limit - debt;
                        const progress = limit > 0 ? (debt / limit) * 100 : 0;

                        return (
                            <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-gray-900 text-lg">{c.name}</p>
                                        {!c.status && <span className="text-[10px] bg-red-100 text-red-600 px-2 rounded-full font-bold">INATIVO</span>}
                                    </div>
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <span>{c.cpf || 'Sem CPF'}</span>
                                        <span>{c.phone || 'Sem Telefone'}</span>
                                    </div>
                                    
                                    {/* Barra de Limite */}
                                    <div className="mt-3 max-w-sm">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500">Limite: <strong>{formatCurrency(limit)}</strong></span>
                                            <span className={`${available < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-medium'}`}>
                                                Disp: {formatCurrency(available)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div 
                                                className={`h-1.5 rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Dívida Atual</p>
                                        <p className={`font-black text-xl ${debt > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {formatCurrency(debt)}
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setPaymentModal({ open: true, customer: c })}
                                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 transition-colors"
                                            title="Receber Pagamento"
                                        >
                                            <DollarSign size={20} />
                                        </button>
                                        <button 
                                            onClick={() => openLedger(c)}
                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors"
                                            title="Ver Extrato"
                                        >
                                            <FileText size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* MODAL NOVO CLIENTE */}
        {showRegisterModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="text-brand-yellow" /> Novo Cliente
                        </h2>
                        <button onClick={() => setShowRegisterModal(false)}><X className="text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                        <Input label="Nome Completo" placeholder="Ex: João Silva" {...register('name', { required: true })} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="CPF (Apenas números)" placeholder="000.000.000-00" {...register('cpf')} />
                            <Input label="Telefone" placeholder="(00) 00000-0000" {...register('phone')} />
                        </div>
                        <Input label="Email (Opcional)" placeholder="joao@email.com" {...register('email')} />
                        
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                            <Input 
                                label="Limite de Crédito (R$)" 
                                placeholder="0.00" 
                                type="number" 
                                step="0.01" 
                                className="font-bold text-lg"
                                {...register('credit_limit', { required: true })} 
                            />
                            <p className="text-xs text-yellow-700 mt-1">
                                Valor máximo acumulado que este cliente pode dever.
                            </p>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowRegisterModal(false)}>Cancelar</Button>
                            <Button type="submit" variant="primary" className="flex-1">Cadastrar</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL PAGAMENTO */}
        {paymentModal.open && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                    <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-green-600">
                        <DollarSign /> Baixar Dívida
                    </h2>
                    <p className="text-gray-500 text-sm mb-6 font-medium">Cliente: {paymentModal.customer?.name}</p>
                    
                    <form onSubmit={handleSubmitPay(handlePayment)} className="space-y-4">
                        <Input 
                            label="Valor a Pagar" 
                            type="number" 
                            step="0.01" 
                            autoFocus 
                            className="text-2xl font-black text-green-600"
                            {...registerPay('amount', { required: true })} 
                        />

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Forma de Pagamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                <label className="cursor-pointer">
                                    <input type="radio" value="dinheiro" {...registerPay('payment_method')} className="peer sr-only" />
                                    <div className="p-2 border rounded-lg text-center peer-checked:bg-green-100 peer-checked:border-green-500 peer-checked:text-green-700 hover:bg-gray-50">
                                        <Banknote size={20} className="mx-auto mb-1"/>
                                        <span className="text-xs font-bold">Dinheiro</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input type="radio" value="pix" {...registerPay('payment_method')} className="peer sr-only" />
                                    <div className="p-2 border rounded-lg text-center peer-checked:bg-teal-100 peer-checked:border-teal-500 peer-checked:text-teal-700 hover:bg-gray-50">
                                        <QrCode size={20} className="mx-auto mb-1"/>
                                        <span className="text-xs font-bold">PIX</span>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input type="radio" value="cartao_debito" {...registerPay('payment_method')} className="peer sr-only" />
                                    <div className="p-2 border rounded-lg text-center peer-checked:bg-blue-100 peer-checked:border-blue-500 peer-checked:text-blue-700 hover:bg-gray-50">
                                        <CreditCard size={20} className="mx-auto mb-1"/>
                                        <span className="text-xs font-bold">Débito</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <Input 
                            label="Observação (Opcional)" 
                            placeholder="Ex: Acerto parcial" 
                            {...registerPay('description')} 
                        />
                        
                        <div className="flex gap-3 mt-6">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setPaymentModal({ open: false, customer: null })} disabled={paymentLoading}>Cancelar</Button>
                            <Button type="submit" variant="success" className="flex-1 font-bold flex items-center justify-center gap-2" disabled={paymentLoading}>
                                {paymentLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> Processando...
                                    </>
                                ) : (
                                    'Confirmar'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL EXTRATO (LEDGER) - ATUALIZADO */}
        {ledgerState.open && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{ledgerState.customer?.name}</h2>
                            <p className="text-sm text-gray-500">Extrato Financeiro</p>
                        </div>
                        <button onClick={() => setLedgerState({...ledgerState, open: false})}><X className="text-gray-400" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0">
                        {ledgerState.loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-yellow" size={40} /></div>
                        ) : ledgerState.transactions.length === 0 ? (
                            <p className="text-center text-gray-400 py-20">Nenhuma movimentação registrada.</p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {ledgerState.transactions.map((entry, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 group">
                                        <div className="flex items-center gap-3">
                                            {/* ÍCONES ATUALIZADOS */}
                                            <div className={`p-2 rounded-full ${entry.type === 'divida' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {entry.type === 'divida' ? <ShoppingCart size={20} /> : <CheckCircle size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 flex items-center gap-2">
                                                    {entry.description || (entry.type === 'divida' ? 'Compra no PDV' : 'Pagamento')}
                                                    {/* LINK PARA VENDA SE HOUVER SALE_ID */}
                                                    {entry.sale_id && (
                                                        <button 
                                                            onClick={() => goToSale(entry.sale_id)}
                                                            className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1 hover:bg-brand-yellow hover:text-brand-dark transition-colors" 
                                                            title="Ver Detalhes da Venda"
                                                        >
                                                            <ExternalLink size={10} /> Venda
                                                        </button>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-400">{formatDate(entry.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block text-base font-bold ${entry.type === 'divida' ? 'text-red-600' : 'text-green-600'}`}>
                                                {entry.type === 'divida' ? '+' : '-'} {formatCurrency(entry.amount)}
                                            </span>
                                            {/* SALDO PROGRESSIVO */}
                                            <span className="text-xs text-gray-400 font-medium">
                                                Saldo: {formatCurrency(entry.current_balance)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 border-t border-gray-100 bg-white">
                         <div className="flex justify-between items-center bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                             <span className="text-red-800 font-bold uppercase text-xs">Saldo Devedor Total</span>
                             {/* Usando o saldo do último item da lista calculada se disponível, ou o do cliente */}
                             <span className="text-2xl font-black text-red-600">
                                {formatCurrency(
                                    ledgerState.transactions.length > 0 
                                    ? ledgerState.transactions[ledgerState.transactions.length - 1].current_balance 
                                    : (ledgerState.customer?.current_debt || 0)
                                )}
                             </span>
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
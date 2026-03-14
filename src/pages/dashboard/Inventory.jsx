import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
    Plus, Package, ArrowUpCircle, ArrowDownCircle, History, 
    Search, Store, Loader2, Barcode, ScanBarcode, X, Wand2, Download, RefreshCw,
    Edit2, Check 
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProductHistoryModal from '../../components/inventory/ProductHistoryModal';
import { formatCurrency } from '../../lib/utils';
import axios from 'axios';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState(""); 
  
  // Estado da Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingEan, setLoadingEan] = useState(false);

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [movementModal, setMovementModal] = useState({ open: false, product: null, type: 'entrada' });
  const [historyModalProduct, setHistoryModalProduct] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const { 
    register: registerEdit, 
    handleSubmit: handleSubmitEdit, 
    reset: resetEdit, 
    formState: { isSubmitting: isEditing } 
  } = useForm();

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, setValue: setValueCreate, getValues: getValuesCreate, formState: { isSubmitting: creating } } = useForm();
  const { register: registerMove, handleSubmit: handleSubmitMove, reset: resetMove, formState: { isSubmitting: moving } } = useForm();

  // 1. Carrega os Mercados
  useEffect(() => {
    async function loadMarkets() {
        try {
            const { data } = await api.get('/identity/markets');
            setMarkets(data);
            if (data.length > 0) setSelectedMarketId(data[0].id);
        } catch (error) {
            console.error(error);
        }
    }
    loadMarkets();
  }, []);

  // 2. Carrega Produtos quando a loja muda
  const loadProducts = useCallback(async () => {
      if (!selectedMarketId) return;
      try {
          setLoading(true);
          const { data } = await api.get(`/inventory/${selectedMarketId}/products`);
          setProducts(data);
      } catch (error) {
          toast.error("Erro ao carregar estoque.");
      } finally {
          setLoading(false);
      }
  }, [selectedMarketId]);

  useEffect(() => {
      loadProducts();
  }, [loadProducts]);

  // --- NOVA FUNÇÃO: AUTO INCREMENTO DE CÓDIGO ---
  const suggestNextCode = useCallback(() => {
      if (!products || products.length === 0) {
          setValueCreate('code', '00001');
          return;
      }
      
      // Filtra apenas códigos que são numéricos para encontrar o maior
      const codes = products
          .map(p => parseInt(p.code))
          .filter(n => !isNaN(n));
      
      const max = codes.length > 0 ? Math.max(...codes) : 0;
      const next = String(max + 1).padStart(5, '0'); // Ex: 00052
      
      setValueCreate('code', next);
  }, [products, setValueCreate]);

  // Função para abrir modal já sugerindo código
  const openCreateModal = () => {
      resetCreate();
      suggestNextCode();
      setShowCreateModal(true);
  };

  // 3. Filtragem de Produtos (Busca)
  const filteredProducts = products.filter(p => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
          p.name.toLowerCase().includes(lower) ||
          (p.code && p.code.toLowerCase().includes(lower)) ||
          (p.barcode && p.barcode.includes(lower))
      );
  });

  // CORREÇÃO: Tratamento de Tipos para evitar 422
  const handleCreateProduct = async (data) => {
      try {
          const payload = {
              name: data.name,
              code: data.code,
              barcode: data.barcode || null,
              price: parseFloat(data.price), // Garante float
              cost_price: data.cost_price ? parseFloat(data.cost_price) : 0.00, // Garante float ou 0.00
              ncm: data.ncm || null,
              origin: 0 // Default (Nacional) conforme spec
          };

          await api.post(`/inventory/${selectedMarketId}/products`, payload);
          toast.success("Produto criado com sucesso!");
          setShowCreateModal(false);
          resetCreate();
          loadProducts();
      } catch (error) {
          console.error("Erro ao criar produto:", error);
          const msg = error.response?.data?.detail;
          
          if (Array.isArray(msg)) {
              toast.error("Erro de validação: Verifique os campos.");
          } else {
              toast.error(typeof msg === 'string' ? msg : "Erro ao criar produto.");
          }
      }
  };

  const handleRegisterMovement = async (data) => {
      if (!movementModal.product) return;
      try {
          const movementType = movementModal.type === 'entrada' ? 'ajuste_entrada' : 'ajuste_saida';

          const payload = {
              market_id: selectedMarketId, 
              product_id: movementModal.product.id,
              movement_type: movementType, 
              quantity: parseFloat(data.quantity),
              reason: data.reason || (movementModal.type === 'entrada' ? "Ajuste de Entrada" : "Ajuste de Saída")
          };

          await api.post(`/inventory/${selectedMarketId}/movements`, payload);
          toast.success("Estoque atualizado!");
          setMovementModal({ ...movementModal, open: false });
          resetMove();
          loadProducts();
      } catch (error) {
          toast.error("Erro ao atualizar estoque.");
      }
  };

  // --- CONSULTA EAN (NOME + NCM) ---
  const fetchProductByEan = async () => {
    let ean = getValuesCreate('barcode');
    
    if (ean) ean = ean.replace(/\D/g, ''); // Sanitiza

    if (!ean || ean.length < 8) {
        toast.error("Digite um código de barras válido.");
        return;
    }
    
    setLoadingEan(true);
    try {
        let found = false;
        let productData = { name: "", ncm: "" };

        // 1. Base Demo Expandida (Com NCMs reais aproximados)
        const demoProducts = {
            '7891000088791': { name: 'Chocolate KitKat Nestlé 41,5g', ncm: '18063210' },
            '7891000100103': { name: 'Chocolate KitKat White 41,5g', ncm: '18063210' },
            '7894900011517': { name: 'Refrigerante Coca-Cola Lata 350ml', ncm: '22021000' },
            '7894900011555': { name: 'Refrigerante Coca-Cola 600ml', ncm: '22021000' },
            '7894900010015': { name: 'Refrigerante Coca-Cola 2L', ncm: '22021000' },
            '7891000053508': { name: 'Caixa de Bombom Garoto 250g', ncm: '18069000' },
            '7891991010856': { name: 'Cerveja Budweiser Long Neck 330ml', ncm: '22030000' },
            '7896004006482': { name: 'Cerveja Skol Lata 350ml', ncm: '22030000' }
        };

        if (demoProducts[ean]) {
            productData = demoProducts[ean];
            found = true;
        }

        // 2. Fallback API Pública (Open Food Facts geralmente não tem NCM preciso para o Brasil, mas tentamos o nome)
        if (!found) {
            try {
                const res = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
                if (res.data.status === 1) {
                    const product = res.data.product;
                    const name = product.product_name_pt || product.product_name || "";
                    // Tenta adivinhar NCM pela categoria (muito básico) ou deixa vazio
                    const ncm = ""; 
                    
                    if (name) {
                        productData = { name, ncm };
                        found = true;
                    }
                }
            } catch (err) {
                console.warn("API Error", err);
            }
        }

        if (found) {
            setValueCreate('name', productData.name);
            // Só preenche NCM se a API/Demo retornou algo, senão mantém o que o user digitou ou vazio
            if (productData.ncm) setValueCreate('ncm', productData.ncm);
            
            toast.success("Dados encontrados!");
        } else {
            toast.error("Produto não encontrado na base. Preencha manualmente.");
        }
    } catch (error) {
        toast.error("Erro na consulta.");
    } finally {
        setLoadingEan(false);
    }
  };

  const downloadInventory = () => {
    if (products.length === 0) return toast.error("Sem produtos para exportar.");

    const headers = ["Nome", "Código", "EAN", "NCM", "Custo", "Venda", "Estoque"];
    const rows = products.map(p => [
        `"${p.name.replace(/"/g, '""')}"`, 
        p.code || "",
        `"${p.barcode || ""}"`,
        p.ncm || "",
        Number(p.cost_price).toFixed(2).replace('.', ','),
        Number(p.price).toFixed(2).replace('.', ','),
        Number(p.current_stock).toFixed(3).replace('.', ',')
    ]);

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `estoque_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const startEditing = (product) => {
      resetEdit({
          name: product.name,
          price: product.price,
          cost_price: product.cost_price || '',
          ncm: product.ncm || ''
      });
      setEditingProductId(product.id);
  };

  const cancelEditing = () => {
      setEditingProductId(null);
      resetEdit();
  };

  const handleSaveEdit = async (data) => {
      try {
          const payload = {
              name: data.name,
              price: parseFloat(data.price),
              cost_price: data.cost_price ? parseFloat(data.cost_price) : 0.00,
              ncm: data.ncm || null,
              origin: 0 // Mantendo o default
          };

          // Chamada PUT conforme solicitado
          await api.put(`/inventory/${selectedMarketId}/product/${editingProductId}`, payload);
          
          toast.success("Produto atualizado com sucesso!");
          setEditingProductId(null);
          loadProducts(); // Recarrega a listagem para refletir os dados
      } catch (error) {
          console.error("Erro ao editar produto:", error);
          toast.error("Erro ao atualizar os dados do produto.");
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Package className="text-brand-yellow" /> Gestão de Estoque
                </h1>
                <p className="text-gray-500">Controle de produtos e ajustes de quantidade.</p>
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
                
                <Button variant="secondary" onClick={downloadInventory}>
                    <Download size={18} /> Exportar
                </Button>

                {/* BOTÃO AGORA CHAMA openCreateModal PARA SUGERIR CÓDIGO */}
                <Button onClick={openCreateModal}>
                    <Plus size={18} /> Novo Produto
                </Button>
            </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-6 shadow-sm flex items-center gap-4 focus-within:ring-2 focus-within:ring-brand-yellow/50">
            <Search className="text-gray-400" />
            <input 
                placeholder="Buscar por nome, código interno ou código de barras..." 
                className="flex-1 outline-none text-gray-700 font-medium placeholder:font-normal"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase">
                    Limpar
                </button>
            )}
        </div>

        {/* Lista de Produtos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-yellow" size={40} /></div>
            ) : filteredProducts.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{searchTerm ? "Nenhum produto encontrado." : "Nenhum produto cadastrado."}</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {filteredProducts.map(p => (
    editingProductId === p.id ? (
        /* --- MODO DE EDIÇÃO INLINE --- */
        <div key={`edit-${p.id}`} className="p-5 bg-brand-yellow/5 border-l-4 border-brand-yellow shadow-inner transition-all flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
                    <Edit2 size={16} /> Editando Produto
                </span>
                <span className="text-xs font-mono bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
                    Cód: {p.code}
                </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-start">
                <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome do Produto</label>
                    <input 
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-yellow bg-white" 
                        {...registerEdit('name', { required: true })} 
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">NCM (Fiscal)</label>
                    <input 
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-yellow bg-white" 
                        {...registerEdit('ncm')} 
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Custo (R$)</label>
                    <input 
                        type="number" step="0.01" 
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-yellow bg-white" 
                        {...registerEdit('cost_price')} 
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Venda (R$)</label>
                    <input 
                        type="number" step="0.01" 
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500 bg-white" 
                        {...registerEdit('price', { required: true })} 
                    />
                </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
                <Button type="button" variant="secondary" size="sm" onClick={cancelEditing} disabled={isEditing}>
                    Cancelar
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleSubmitEdit(handleSaveEdit)} isLoading={isEditing}>
                    <Check size={18} className="mr-1" /> Salvar Edição
                </Button>
            </div>
        </div>
    ) : (
        /* --- MODO DE VISUALIZAÇÃO PADRÃO --- */
        <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 text-lg">{p.name}</p>
                    <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200">
                        Cód: {p.code}
                    </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1" title="Código de Barras">
                        <Barcode size={14}/> {p.barcode || 'S/N'}
                    </span>
                    {p.ncm && (
                        <span className="flex items-center gap-1" title="NCM (Fiscal)">
                            <span className="text-[10px] font-bold border border-gray-200 px-1 rounded">NCM</span> {p.ncm}
                        </span>
                    )}
                    <span className="font-medium text-green-600">Venda: {formatCurrency(p.price)}</span>
                </div>
            </div>

            <div className="flex items-center gap-6 justify-between sm:justify-end">
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Estoque Atual</p>
                    <p className={`font-black text-2xl ${p.current_stock <= 5 ? 'text-red-500' : 'text-gray-800'}`}>
                        {Number(p.current_stock).toFixed(2)} <span className="text-sm font-medium text-gray-400">un</span>
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {/* NOVO BOTÃO DE EDITAR */}
                    <button 
                        onClick={() => startEditing(p)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors"
                        title="Editar Produto"
                    >
                        <Edit2 size={20} />
                    </button>
                    {/* FIM BOTÃO DE EDITAR */}
                    <button 
                        onClick={() => setMovementModal({ open: true, product: p, type: 'entrada' })}
                        className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 transition-colors"
                        title="Adicionar Estoque"
                    >
                        <ArrowUpCircle size={20} />
                    </button>
                    <button 
                        onClick={() => setMovementModal({ open: true, product: p, type: 'saida' })}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors"
                        title="Remover Estoque"
                    >
                        <ArrowDownCircle size={20} />
                    </button>
                    <button 
                        onClick={() => setHistoryModalProduct(p)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 transition-colors"
                        title="Ver Histórico"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
))}
                </div>
            )}
        </div>

        {/* MODAL CRIAR PRODUTO */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Package className="text-brand-yellow" /> Novo Produto
                        </h2>
                        <button onClick={() => setShowCreateModal(false)}><X className="text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmitCreate(handleCreateProduct)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <Input 
                                    label="Código de Barras (EAN)" 
                                    icon={ScanBarcode} 
                                    placeholder="789..." 
                                    {...registerCreate('barcode')} 
                                />
                                <button 
                                    type="button"
                                    onClick={fetchProductByEan}
                                    disabled={loadingEan}
                                    className="absolute right-2 top-[30px] p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                    title="Consultar Online"
                                >
                                    {loadingEan ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                                </button>
                            </div>

                            <div className="relative">
                                <Input label="Código Interno" placeholder="Ex: 00100" {...registerCreate('code', { required: true })} />
                                <button
                                    type="button" 
                                    onClick={suggestNextCode}
                                    className="absolute right-2 top-[30px] p-1.5 text-gray-400 hover:text-brand-dark transition-colors"
                                    title="Gerar próximo código"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Nome do Produto" placeholder="Ex: Arroz 5kg" {...registerCreate('name', { required: true })} />
                            <Input label="NCM (Fiscal)" placeholder="0000.00.00" {...registerCreate('ncm')} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <Input label="Preço de Custo (R$)" placeholder="0.00" type="number" step="0.01" {...registerCreate('cost_price')} />
                            <Input label="Preço de Venda (R$)" placeholder="0.00" type="number" step="0.01" className="font-bold text-green-700" {...registerCreate('price', { required: true })} />
                        </div>
                        <div className="pt-2 flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                            <Button type="submit" variant="primary" className="flex-1" isLoading={creating}>Cadastrar Produto</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL MOVIMENTAÇÃO */}
        {movementModal.open && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                    <h2 className={`text-xl font-bold mb-1 flex items-center gap-2 ${movementModal.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {movementModal.type === 'entrada' ? <ArrowUpCircle /> : <ArrowDownCircle />}
                        {movementModal.type === 'entrada' ? 'Entrada de Estoque' : 'Saída / Quebra'}
                    </h2>
                    <p className="text-gray-500 text-sm mb-6 font-medium">{movementModal.product?.name}</p>
                    
                    <form onSubmit={handleSubmitMove(handleRegisterMovement)}>
                        <div className="space-y-4">
                            <Input 
                                label="Quantidade" 
                                type="number" 
                                step="0.001" 
                                autoFocus 
                                className="text-2xl font-black"
                                {...registerMove('quantity', { required: true, min: 0.001 })} 
                            />
                            
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo</label>
                                <input 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-yellow"
                                    placeholder={movementModal.type === 'entrada' ? "Ex: Nota Fiscal 123" : "Ex: Vencimento, Roubo"}
                                    {...registerMove('reason')}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setMovementModal({ ...movementModal, open: false })}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                variant={movementModal.type === 'entrada' ? 'success' : 'danger'} 
                                className="flex-1 font-bold"
                                isLoading={moving}
                            >
                                Confirmar
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL HISTÓRICO */}
        {historyModalProduct && (
            <ProductHistoryModal 
                product={historyModalProduct} 
                marketId={selectedMarketId} 
                onClose={() => setHistoryModalProduct(null)} 
            />
        )}
    </div>
  );
}
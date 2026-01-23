import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Monitor, Plus, Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TerminalSelector({ marketId, onSelect }) {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTerminalName, setNewTerminalName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  // Função auxiliar para garantir IDs limpos
  const cleanId = (id) => id ? id.toString().replace(/[^a-zA-Z0-9-]/g, '') : '';

  const loadTerminals = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/sales/${marketId}/terminals`);
      setTerminals(data);
    } catch (error) {
      console.error("Erro ao carregar terminais:", error);
      toast.error("Erro ao carregar lista de caixas.");
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    loadTerminals();
  }, [loadTerminals]);

  const handleSelect = (terminal) => {
    if (!terminal.active) {
      toast.error("Este terminal está inativo.");
      return;
    }
    
    const safeMarketId = cleanId(marketId);
    const safeTerminalId = cleanId(terminal.id);

    // Salva no LocalStorage sanitizado
    localStorage.setItem(`terminal_${safeMarketId}`, safeTerminalId);
    localStorage.setItem(`terminal_name_${safeMarketId}`, terminal.name);
    
    onSelect(safeTerminalId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTerminalName.trim()) return;

    setCreatingLoading(true);
    try {
      const { data } = await api.post(`/sales/${marketId}/terminals`, {
        name: newTerminalName
      });
      toast.success("Terminal criado com sucesso!");
      // Já seleciona o novo terminal criado
      handleSelect(data); 
    } catch (error) {
      const msg = error.response?.data?.detail || "Erro ao criar terminal.";
      toast.error(msg);
      // Se der erro, mantém o modal aberto para o usuário tentar novamente ou corrigir
    } finally {
      setCreatingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
        <div className="text-center animate-pulse">
          <Loader2 className="animate-spin text-brand-yellow mx-auto mb-4" size={48} />
          <p className="text-gray-500 font-medium">Carregando terminais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-200">
        <div className="bg-brand-yellow p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/10" />
          <Monitor className="mx-auto text-brand-dark mb-3 relative z-10" size={56} />
          <h2 className="text-3xl font-black text-brand-dark relative z-10 tracking-tight">Configurar PDV</h2>
          <p className="text-brand-dark/80 font-medium relative z-10 mt-1">Identifique este ponto de venda</p>
        </div>

        <div className="p-6">
          {!isCreating ? (
            <>
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Terminais Disponíveis</h3>
                 <button onClick={loadTerminals} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors">
                    <RefreshCw size={16} />
                 </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto mb-6 pr-1 custom-scrollbar">
                {terminals.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <p>Nenhum terminal encontrado.</p>
                  </div>
                ) : (
                  terminals.map(term => (
                    <button
                      key={term.id}
                      onClick={() => handleSelect(term)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden ${
                        term.active 
                          ? 'border-gray-200 hover:border-brand-yellow hover:bg-yellow-50 bg-white' 
                          : 'border-red-100 bg-red-50 opacity-70 cursor-not-allowed'
                      }`}
                      disabled={!term.active}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${term.active ? 'bg-green-50' : 'bg-red-50'}`} />
                        <span className="font-bold text-gray-800 text-lg group-hover:text-brand-dark">{term.name}</span>
                      </div>
                      {term.active && (
                        <CheckCircle className="text-gray-300 group-hover:text-brand-yellow opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" size={24} />
                      )}
                    </button>
                  ))
                )}
              </div>

              <Button 
                variant="secondary" 
                className="w-full border-dashed border-2 py-3 text-gray-600 hover:text-brand-dark hover:border-brand-yellow" 
                onClick={() => setIsCreating(true)}
              >
                <Plus size={18} /> Cadastrar Novo Terminal
              </Button>
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800">
                <AlertTriangle className="shrink-0" size={18} />
                <p>Criar um novo terminal pode consumir uma licença do seu plano atual.</p>
              </div>

              <Input
                label="Nome do Caixa"
                placeholder="Ex: Caixa 02, Balcão..."
                value={newTerminalName}
                onChange={e => setNewTerminalName(e.target.value)}
                autoFocus
                className="text-lg"
              />

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={() => setIsCreating(false)}
                >
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 font-bold shadow-lg"
                  isLoading={creatingLoading}
                  disabled={!newTerminalName.trim()}
                >
                  Criar Terminal
                </Button>
              </div>
            </form>
          )}
        </div>
        
        <div className="bg-gray-50 p-3 text-center text-[10px] text-gray-400 border-t border-gray-100 uppercase font-bold tracking-widest">
          SGM Marketfy • PDV Seguro
        </div>
      </div>
    </div>
  );
}
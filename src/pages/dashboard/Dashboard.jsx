import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext'; // Import user
import { useProductSync } from '../../hooks/useProductSync'; // Import Sync
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Store, MapPin, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const marketSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().min(14, 'CNPJ inválido'),
  address: z.string().min(5, 'Endereço obrigatório'),
});

export default function Dashboard() {
  const { user } = useAuth(); // Pegar user para boas vindas
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  // Hook de Sync
  const { syncAllProducts, syncing } = useProductSync();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(marketSchema)
  });

  const fetchMarkets = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/identity/markets');
      setMarkets(data);
      
      // AUTO SYNC: Assim que carregar as lojas, baixa os produtos para o cache local
      if (data.length > 0) {
        syncAllProducts(data);
      }
      
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar lojas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const handleCreateMarket = async (data) => {
    try {
      await api.post('/identity/markets', data);
      toast.success('Loja criada com sucesso!');
      setShowCreateModal(false);
      fetchMarkets();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao criar loja.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name?.split(' ')[0] || 'Lojista'}! 👋</h1>
          <p className="text-gray-500">Selecione uma loja para gerenciar ou começar a vender.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => syncAllProducts(markets)} disabled={syncing}>
               <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
               {syncing ? "Sincronizando..." : "Atualizar Dados Offline"}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} /> Nova Loja
            </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhuma loja encontrada</h3>
          <p className="text-gray-500 mb-6">Cadastre sua primeira loja para começar.</p>
          <Button onClick={() => setShowCreateModal(true)}>
            Criar Minha Primeira Loja
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => (
            <div 
              key={market.id} 
              onClick={() => navigate(`/pdv/${market.id}`)}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate('/inventory'); }}>
                    Gerir Estoque
                 </Button>
              </div>

              <div className="w-12 h-12 bg-brand-yellow/10 rounded-xl flex items-center justify-center text-brand-dark mb-4 group-hover:scale-110 transition-transform">
                <Store size={24} />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{market.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <MapPin size={14} />
                <span className="truncate">{market.address}</span>
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Online
                </span>
                <span className="text-sm font-medium text-brand-dark flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Abrir PDV →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO (Mesmo código anterior) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Store className="text-brand-yellow" /> Nova Loja
            </h2>
            <form onSubmit={handleSubmit(handleCreateMarket)} className="space-y-4">
              <Input 
                label="Nome da Loja" 
                placeholder="Ex: Mercadinho Central" 
                {...register('name')} 
                error={errors.name?.message} 
              />
              <Input 
                label="CNPJ" 
                placeholder="00.000.000/0001-00" 
                {...register('document')} 
                error={errors.document?.message} 
              />
              <Input 
                label="Endereço Completo" 
                placeholder="Rua, Número, Bairro" 
                {...register('address')} 
                error={errors.address?.message} 
              />
              
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>Criar Loja</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useCallback } from 'react';
import api from '../lib/api';
import { applyDeltaSync, syncCustomersLocal } from '../lib/db';
import toast from 'react-hot-toast';

export function useProductSync() {
  const [syncing, setSyncing] = useState(false);

  /**
   * Sincronização Inteligente (Dados Essenciais).
   * Sincroniza Produtos (Delta) e Clientes (Full) para funcionamento Offline.
   */
  const syncAllProducts = useCallback(async (markets) => {
    if (!markets || markets.length === 0) return;
    
    setSyncing(true);
    let totalUpdated = 0;
    let totalDeleted = 0;
    let customersCount = 0;

    try {
      // Executa em paralelo para todas as lojas que o usuário tem acesso
      const promises = markets.map(async (market) => {
        try {
          // --- 1. SYNC DE PRODUTOS (Delta) ---
          const storageKey = `last_sync_${market.id}`;
          const lastUpdated = localStorage.getItem(storageKey);
          
          const params = {};
          if (lastUpdated) {
            params.last_updated = lastUpdated;
          }

          // Chama o endpoint otimizado de produtos
          const { data: prodData } = await api.get(`/inventory/${market.id}/products/sync`, { params });
          
          if (prodData.updated.length > 0 || prodData.deleted.length > 0) {
             // Garante que o market_id esteja presente nos objetos para o Dexie indexar corretamente
             const productsToUpdate = prodData.updated.map(p => ({ ...p, market_id: market.id }));
             
             // Aplica as mudanças no banco local
             await applyDeltaSync(productsToUpdate, prodData.deleted);
             
             totalUpdated += productsToUpdate.length;
             totalDeleted += prodData.deleted.length;
          }
          
          // Atualiza o timestamp para a próxima vez
          if (prodData.server_time) {
            localStorage.setItem(storageKey, prodData.server_time);
          }

          // --- 2. SYNC DE CLIENTES (Full) ---
          // ROTA CORRIGIDA: /finance/{market_id}/customers
          const { data: custData } = await api.get(`/finance/${market.id}/customers`);
          
          if (custData && Array.isArray(custData)) {
              // Adiciona o market_id para salvar no banco local corretamente
              const customersWithId = custData.map(c => ({ ...c, market_id: market.id }));
              await syncCustomersLocal(customersWithId);
              customersCount += customersWithId.length;
          }
          
        } catch (err) {
          console.error(`Erro ao sincronizar loja ${market.name}:`, err);
          // Não lançamos erro aqui para não travar o sync das outras lojas
        }
      });

      await Promise.all(promises);

      if (totalUpdated > 0 || totalDeleted > 0 || customersCount > 0) {
        toast.success(`Sincronizado: ${totalUpdated} produtos e ${customersCount} clientes.`);
      } else {
        console.log("[Sync] Dados já estavam atualizados.");
      }

    } catch (error) {
      console.error("Erro geral no sync de dados:", error);
      toast.error("Erro ao sincronizar dados.");
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    syncAllProducts,
    syncing
  };
}
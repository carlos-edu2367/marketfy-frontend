import { useState, useCallback } from 'react';
import api from '../lib/api';
import { applyDeltaSync } from '../lib/db';
import toast from 'react-hot-toast';

export function useProductSync() {
  const [syncing, setSyncing] = useState(false);

  /**
   * Sincronização Inteligente (Delta Sync).
   * Para cada loja, verifica a última vez que sincronizou e pede apenas as novidades.
   */
  const syncAllProducts = useCallback(async (markets) => {
    if (!markets || markets.length === 0) return;
    
    setSyncing(true);
    let totalUpdated = 0;
    let totalDeleted = 0;

    try {
      // Executa em paralelo para todas as lojas que o usuário tem acesso
      const promises = markets.map(async (market) => {
        try {
          const storageKey = `last_sync_${market.id}`;
          const lastUpdated = localStorage.getItem(storageKey);
          
          const params = {};
          if (lastUpdated) {
            params.last_updated = lastUpdated;
          }

          // Chama o endpoint otimizado
          const { data } = await api.get(`/inventory/${market.id}/products/sync`, { params });
          
          // data = { updated: [...], deleted: [...], server_time: "..." }
          
          if (data.updated.length > 0 || data.deleted.length > 0) {
             // Garante que o market_id esteja presente nos objetos para o Dexie indexar corretamente
             const productsToUpdate = data.updated.map(p => ({ ...p, market_id: market.id }));
             
             // Aplica as mudanças no banco local
             await applyDeltaSync(productsToUpdate, data.deleted);
             
             totalUpdated += productsToUpdate.length;
             totalDeleted += data.deleted.length;
          }
          
          // Atualiza o timestamp para a próxima vez
          if (data.server_time) {
            localStorage.setItem(storageKey, data.server_time);
          }
          
        } catch (err) {
          console.error(`Erro ao sincronizar loja ${market.name}:`, err);
          // Não lançamos erro aqui para não travar o sync das outras lojas
        }
      });

      await Promise.all(promises);

      if (totalUpdated > 0 || totalDeleted > 0) {
        toast.success(`Catálogo atualizado: ${totalUpdated} novos/editados.`);
      } else {
        console.log("[Sync] Catálogo já estava atualizado.");
      }

    } catch (error) {
      console.error("Erro geral no sync de produtos:", error);
      toast.error("Erro ao sincronizar produtos.");
    } finally {
      setSyncing(false);
    }
  }, []);

  return { syncAllProducts, syncing };
}
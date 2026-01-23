import Dexie from 'dexie';

export const db = new Dexie('SGMMarketfyDB');

// Definição do Schema Local
db.version(1).stores({
  // Tabela de Produtos para consulta Offline rápida
  products: 'id, code, barcode, market_id, name', 
  
  // Fila de Vendas Offline
  sales_queue: '++id, market_id, status, created_at', 
  
  // Dados do Usuário/Sessão local
  session: 'key, value' 
});

// Helper legado (mantido por compatibilidade, mas o ideal é usar o delta)
export async function syncProductsLocal(productsList) {
  try {
    await db.products.bulkPut(productsList);
    console.log(`[Dexie] Sincronizados ${productsList.length} produtos (Full Sync).`);
  } catch (error) {
    console.error("[Dexie] Erro ao sincronizar produtos:", error);
  }
}

/**
 * Aplica o Delta Sync (Incremental)
 * Recebe lista de produtos criados/editados para salvar
 * Recebe lista de IDs para remover (Soft delete no server -> Hard delete local)
 */
export async function applyDeltaSync(updatedProducts, deletedIds) {
  return db.transaction('rw', db.products, async () => {
    // 1. Atualiza ou Cria novos
    if (updatedProducts && updatedProducts.length > 0) {
      await db.products.bulkPut(updatedProducts);
    }
    
    // 2. Remove os deletados
    if (deletedIds && deletedIds.length > 0) {
      await db.products.bulkDelete(deletedIds);
    }
    
    console.log(`[Dexie] Delta aplicado: ${updatedProducts.length} atualizados, ${deletedIds.length} removidos.`);
  });
}
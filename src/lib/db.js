import Dexie from 'dexie';

export const db = new Dexie('SGMMarketfyDB');

// --- GESTÃO DE VERSÕES DO BANCO DE DADOS ---

// Versão 1: Estrutura Inicial (O que provavelmente já existe no seu navegador)
db.version(1).stores({
  products: 'id, code, barcode, market_id, name',
  sales_queue: '++id, market_id, status, created_at',
  session: 'key, value'
});

// Versão 2: Adiciona a tabela de Clientes (Upgrade)
// O Dexie detecta que a versão subiu e cria as tabelas novas automaticamente
db.version(2).stores({
  products: 'id, code, barcode, market_id, name',
  customers: 'id, market_id, name, cpf, phone', // Nova tabela necessária para o Modal
  sales_queue: '++id, market_id, status, created_at',
  session: 'key, value'
});

// --- HELPERS DE SINCRONIZAÇÃO ---

// Helper legado (mantido por compatibilidade)
export async function syncProductsLocal(productsList) {
  try {
    await db.products.bulkPut(productsList);
    console.log(`[Dexie] Sincronizados ${productsList.length} produtos (Full Sync).`);
  } catch (error) {
    console.error("[Dexie] Erro ao sincronizar produtos:", error);
  }
}

// Helper para Sincronizar Clientes Localmente
export async function syncCustomersLocal(customersList) {
  try {
    // Usa put para atualizar se existir ou criar se novo
    await db.customers.bulkPut(customersList);
    console.log(`[Dexie] Sincronizados ${customersList.length} clientes com sucesso.`);
  } catch (error) {
    console.error("[Dexie] Erro ao sincronizar clientes:", error);
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

    // 2. Remove deletados
    if (deletedIds && deletedIds.length > 0) {
      await db.products.bulkDelete(deletedIds);
    }
  });
}
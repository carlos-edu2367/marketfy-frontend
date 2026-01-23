import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import api from '../lib/api';
import toast from 'react-hot-toast';

// --- LOGGER ---
const logger = {
  success: (title, data) => {
    console.groupCollapsed(`%c✅ [SYNC SUCCESS] ${title}`, 'color: #10B981; font-weight: bold;');
    console.log('📦 Dados:', data);
    console.groupEnd();
  },
  error: (title, error, payload) => {
    console.group(`%c❌ [SYNC ERROR] ${title}`, 'color: #EF4444; font-weight: bold;');
    console.log('🚨 Mensagem:', error.response?.data?.detail || error.message);
    
    // EXPANDIR ERROS DE VALIDAÇÃO (422) PARA DEPURAÇÃO
    if (error.response?.status === 422 && Array.isArray(error.response.data.detail)) {
        console.table(error.response.data.detail); 
    }

    console.log('🔢 Status:', error.response?.status);
    console.log('🔗 URL:', error.config?.url);
    console.log('📤 Payload Real Enviado:', payload); 
    if (error.response?.data) console.log('📥 Resposta Backend:', error.response.data);
    console.groupEnd();
  }
};

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Monitora a fila em tempo real
  const pendingSalesCount = useLiveQuery(() => 
    db.sales_queue.where({ status: 'pending' }).count()
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncSales = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    const pendingSales = await db.sales_queue
        .where({ status: 'pending' })
        .toArray();

    if (pendingSales.length === 0) return;

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const currentUserId = userData.id || null;

    setIsSyncing(true);
    let syncedCount = 0;
    let errorsCount = 0;

    const syncPromise = new Promise(async (resolve, reject) => {
        for (const sale of pendingSales) {
            let payloadForLog = null;
            try {
              // === SANITIZAÇÃO DE DADOS ===
              
              // 1. CORREÇÃO CPF: Remove caracteres não numéricos (pontos e traços)
              let customer_cpf = sale.customer_cpf;
              if (customer_cpf && typeof customer_cpf === 'string') {
                  customer_cpf = customer_cpf.replace(/\D/g, ''); // Mantém apenas números
                  if (customer_cpf === '') customer_cpf = null;
              } else {
                  customer_cpf = null;
              }

              // 2. Mapeamento Explícito
              const singleSalePayload = {
                  id: sale.id,
                  market_id: sale.market_id,
                  box_id: sale.box_id,
                  terminal_id: sale.terminal_id,
                  
                  operator_id: sale.operator_id || currentUserId,
                  discount: parseFloat(sale.discount || 0),
                  acrescimo: parseFloat(sale.surcharge || 0),
                  
                  created_at: sale.created_at,
                  customer_cpf: customer_cpf, // CPF Limpo
                  total_amount: parseFloat(sale.total_amount), 
                  
                  items: sale.items.map(item => ({
                      product_id: item.product_id,
                      quantity: parseFloat(item.quantity),
                      unit_price: parseFloat(item.unit_price),
                      total: parseFloat(item.total),
                  })),
                  
                  payments: sale.payments.map(pay => ({
                      method: pay.method,
                      amount: parseFloat(pay.amount)
                  }))
              };

              const payload = { sales: [singleSalePayload] };
              payloadForLog = payload; 

              const response = await api.post(`/sales/${sale.market_id}/sync`, payload);
              
              await db.sales_queue.update(sale.id, { status: 'synced', synced_at: new Date() });
              await db.sales_queue.delete(sale.id);

              logger.success(`Venda ${sale.id.slice(0,8)}`, response.data);
              syncedCount++;

            } catch (error) {
              errorsCount++;
              const status = error.response?.status;
              const errorDetail = error.response?.data?.detail || error.message;

              logger.error(`Falha na Venda ${sale.id.slice(0,8)}`, error, payloadForLog || sale);

              if (status === 400 || status === 422 || status === 404) {
                 await db.sales_queue.update(sale.id, { 
                     status: 'error', 
                     error_log: JSON.stringify({ status, message: errorDetail, date: new Date() }) 
                 });
              }
            }
        }

        if (errorsCount > 0 && syncedCount === 0) {
            reject(`${errorsCount} falhas de envio. Verifique o console.`);
        } else if (errorsCount > 0) {
            resolve(`${syncedCount} enviadas. ${errorsCount} falhas.`);
        } else {
            resolve(`${syncedCount} vendas sincronizadas.`);
        }
    });

    toast.promise(syncPromise, {
        loading: 'Sincronizando vendas...',
        success: (msg) => `Sync: ${msg}`,
        error: (err) => `Erro Sync: ${err}`
    }).catch(err => {
        console.warn("Sync finalizado com erros:", err);
    }).finally(() => {
        setIsSyncing(false);
    });

  }, [isOnline, isSyncing]);

  useEffect(() => {
    if (isOnline && pendingSalesCount > 0) {
        const timer = setTimeout(() => {
            syncSales();
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSalesCount, syncSales]);

  return {
    isOnline,
    isSyncing,
    pendingSalesCount,
    syncSales
  };
}
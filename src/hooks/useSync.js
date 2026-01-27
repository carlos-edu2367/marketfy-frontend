import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [reporting, setReporting] = useState(false);
  
  // Referência para evitar múltiplos disparos simultâneos
  const syncInProgress = useRef(false);
  
  // Monitora a fila PENDENTE em tempo real
  const pendingSalesCount = useLiveQuery(() => 
    db.sales_queue.where({ status: 'pending' }).count()
  );

  // Monitora a fila de FALHAS em tempo real (Retentativas excedidas)
  const failedSalesCount = useLiveQuery(() => 
    db.sales_queue.where({ status: 'failed' }).count()
  );

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        toast.success("Conexão recuperada! O sistema tentará sincronizar em breve.", {
            icon: '📶',
            duration: 4000
        });
    };
    const handleOffline = () => {
        setIsOnline(false);
        toast("Você está offline. As vendas serão salvas localmente.", {
            icon: '📡',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncSales = useCallback(async () => {
    if (!isOnline || syncInProgress.current) return;
    
    const pendingSales = await db.sales_queue
        .where({ status: 'pending' })
        .toArray();

    if (pendingSales.length === 0) return;

    syncInProgress.current = true;
    setIsSyncing(true);
    
    const toastId = toast.loading(`Sincronizando ${pendingSales.length} vendas pendentes...`);

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const currentUserId = userData.id || null;

    let syncedCount = 0;
    let errorsCount = 0;
    let droppedCount = 0;

    try {
        for (const sale of pendingSales) {
            let payloadForLog = null;
            try {
              // === SANITIZAÇÃO DE DADOS ===
              let customer_cpf = sale.customer_cpf;
              if (customer_cpf && typeof customer_cpf === 'string') {
                  customer_cpf = customer_cpf.replace(/\D/g, ''); 
                  if (customer_cpf === '') customer_cpf = null;
              } else {
                  customer_cpf = null;
              }

              // Garante que items e payments sejam arrays válidos
              // Se vier undefined, null ou não for array, usa array vazio
              const itemsList = Array.isArray(sale.items) ? sale.items : [];
              const paymentsList = Array.isArray(sale.payments) ? sale.payments : [];

              const singleSalePayload = {
                  id: sale.id,
                  offline_id: String(sale.id),
                  market_id: sale.market_id,
                  box_id: sale.box_id,
                  terminal_id: sale.terminal_id,
                  operator_id: sale.operator_id || currentUserId,
                  discount: parseFloat(sale.discount || 0),
                  acrescimo: parseFloat(sale.surcharge || 0),
                  created_at: sale.created_at,
                  customer_cpf: customer_cpf, 
                  total_amount: parseFloat(sale.total_amount), 
                  items: itemsList.map(item => ({
                      product_id: item.product_id,
                      product_name: item.name || item.product_name || "Item Indefinido",
                      quantity: parseFloat(item.quantity),
                      unit_price: parseFloat(item.unit_price),
                      total: parseFloat(item.total),
                  })),
                  payments: paymentsList.map(pay => ({
                      method: pay.method,
                      amount: parseFloat(pay.amount)
                  }))
              };

              const payload = { sales: [singleSalePayload] };
              payloadForLog = payload; 

              const response = await api.post(`/sales/${sale.market_id}/sync`, payload);
              
              await db.sales_queue.update(sale.id, { status: 'synced', synced_at: new Date() });
              await db.sales_queue.delete(sale.id);

              logger.success(`Venda ${sale.id}`, response.data);
              syncedCount++;

            } catch (error) {
              errorsCount++;
              const status = error.response?.status;
              const errorDetail = error.response?.data?.detail || error.message;
              
              // LÓGICA DE RETRY (3 TENTATIVAS)
              const currentRetries = (sale.retry_count || 0) + 1;
              const MAX_RETRIES = 3;

              logger.error(`Falha na Venda ${sale.id} (Tentativa ${currentRetries}/${MAX_RETRIES})`, error, payloadForLog || sale);

              if (currentRetries >= MAX_RETRIES) {
                  droppedCount++;
                  // Move para status 'failed' para sair da fila de sync automático
                  await db.sales_queue.update(sale.id, { 
                      status: 'failed', 
                      retry_count: currentRetries,
                      error_log: JSON.stringify({ status, message: errorDetail, date: new Date(), final: true }) 
                  });
                  
                  toast.error(`Venda #${sale.id} movida para "Falhas" após ${MAX_RETRIES} tentativas.`, {
                      duration: 6000,
                      icon: '🚫'
                  });

              } else {
                  await db.sales_queue.update(sale.id, { 
                       retry_count: currentRetries,
                       error_log: JSON.stringify({ status, message: errorDetail, date: new Date() }) 
                  });
              }
            }
        }

        if (errorsCount > 0) {
            const msg = droppedCount > 0 
                ? `${syncedCount} enviadas. ${droppedCount} falharam permanentemente.`
                : `${syncedCount} enviadas. ${errorsCount} serão retentadas.`;
            
            toast.error(msg, { id: toastId });
        } else {
            toast.success(`${syncedCount} vendas sincronizadas com sucesso!`, { id: toastId });
        }

    } catch (err) {
        console.error("Erro fatal no sync:", err);
        toast.error("Erro crítico na sincronização.", { id: toastId });
    } finally {
        setIsSyncing(false);
        syncInProgress.current = false;
    }
  }, [isOnline]);

  // Função para reportar vendas falhas ao suporte automaticamente
  const reportFailedSales = useCallback(async () => {
    setReporting(true);
    const toastId = toast.loading("Gerando relatório técnico detalhado...");

    try {
        const failedSales = await db.sales_queue.where({ status: 'failed' }).toArray();
        
        if (failedSales.length === 0) {
            toast.dismiss(toastId);
            return;
        }

        // 1. Gera o corpo do ticket DETALHADO (COM PROTEÇÃO CONTRA DADOS CORROMPIDOS)
        const reportDetails = failedSales.map(s => {
            const errorInfo = s.error_log ? JSON.parse(s.error_log) : { message: 'N/A' };
            
            // PROTEÇÃO: Garante que items e payments sejam tratados como arrays mesmo se nulos ou objetos
            const itemsList = Array.isArray(s.items) ? s.items : [];
            const paymentsList = Array.isArray(s.payments) ? s.payments : [];

            // Lista formatada de itens
            const itemsSummary = itemsList.length > 0 
                ? itemsList.map(i => `   - ${i.name || i.product_name || 'Item'} (qtd: ${i.quantity})`).join('\n')
                : '   (Sem itens registrados)';

            // Lista formatada de pagamentos
            const paymentsSummary = paymentsList.length > 0
                ? paymentsList.map(p => {
                    const method = p.method ? String(p.method).toUpperCase().replace('_', ' ') : 'DESCONHECIDO';
                    const amount = parseFloat(p.amount || 0).toFixed(2);
                    return `${method}: R$ ${amount}`;
                }).join(', ')
                : '(Sem pagamentos registrados)';

            return `
=== VENDA [ID: ${s.id}] ===
Data: ${new Date(s.created_at).toLocaleString()}
Valor Total: R$ ${parseFloat(s.total_amount || 0).toFixed(2)}
--------------------------------
ITENS:
${itemsSummary}
--------------------------------
PAGAMENTO: ${paymentsSummary}
--------------------------------
ERRO TÉCNICO:
${errorInfo.message}
================================`;
        }).join('\n\n');

        const ticketMessage = `
RELATÓRIO AUTOMÁTICO DE FALHAS DE SINCRONIZAÇÃO
------------------------------------------------
O sistema detectou ${failedSales.length} venda(s) com falha crítica de sincronização.

DETALHES TÉCNICOS COMPLETOS:
${reportDetails}

Solicito análise técnica para processamento manual ou correção dos dados.
`.trim();

        // 2. Envia para a API de Suporte
        await api.post('/support/tickets', {
            subject: `[ALERTA] Falha Crítica em ${failedSales.length} Vendas`,
            message: ticketMessage,
            priority: 'high',
            category: 'technical'
        });

        // 3. Atualiza status local
        await db.transaction('rw', db.sales_queue, async () => {
            for (const sale of failedSales) {
                await db.sales_queue.update(sale.id, { status: 'reported_error' });
            }
        });

        toast.success("Relatório detalhado enviado ao suporte!", { id: toastId });

    } catch (error) {
        console.error("Erro ao reportar:", error);
        toast.error("Erro ao notificar suporte. Verifique o console.", { id: toastId });
    } finally {
        setReporting(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline && pendingSalesCount > 0 && !isSyncing) {
        const timer = setTimeout(() => {
            syncSales();
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSalesCount, isSyncing, syncSales]);

  return {
    isOnline,
    isSyncing,
    pendingSalesCount,
    failedSalesCount,
    reportFailedSales,
    reporting,
    syncSales
  };
}
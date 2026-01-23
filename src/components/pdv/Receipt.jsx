import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../lib/utils';
// import QRCode from 'react-qr-code'; 

const safeRender = (data) => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'object') {
        if ('value' in data) return data.value;
        if ('cpf' in data) return data.cpf;
        return ''; 
    }
    return data;
};

export const Receipt = forwardRef(({ sale, marketInfo, isOffline }, ref) => {
  if (!sale) return null;

  // Cálculos de segurança
  const totalPaid = sale.payments?.reduce((acc, pay) => acc + parseFloat(pay.amount), 0) || 0;
  const totalSale = parseFloat(sale.total_amount || sale.final_amount || 0);
  const change = Math.max(0, totalPaid - totalSale);
  const discount = parseFloat(sale.discount || 0);

  // Dados da Loja
  const marketName = marketInfo?.name || "MERCADO";
  const marketAddress = marketInfo?.address || "Endereço não informado";
  const marketDoc = safeRender(marketInfo?.document) || "";

  // Verifica status fiscal
  const invoice = sale.invoice;
  // Lógica: Só é fiscal se estiver AUTORIZADA e não for offline. 
  // Qualquer erro, rejeição ou processamento cai no recibo não fiscal.
  const isFiscal = !isOffline && invoice && (invoice.status === 'autorizada' || invoice.status === 'AUTORIZADA');
  
  const customerCpf = safeRender(sale.customer_cpf);

  return (
    // ID IMPORTANTE: printable-receipt é o alvo do CSS @media print
    <div id="printable-receipt" ref={ref} className="receipt-container bg-white text-black font-mono text-[10px] leading-tight w-[80mm]">
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body * { visibility: hidden; height: 0; overflow: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; height: auto; overflow: visible; }
          #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; }
        }
      `}</style>

      {/* CABEÇALHO */}
      <div className="text-center border-b border-black pb-2 mb-2">
        <h1 className="font-bold text-sm uppercase">{marketName}</h1>
        <p>{marketAddress}</p>
        <p>CNPJ: {marketDoc}</p>
        <p className="mt-1 font-bold">
            {isFiscal ? 'DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA' : 'RECIBO DE VENDA - SEM VALOR FISCAL'}
        </p>
      </div>

      {/* ITENS */}
      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="text-left w-full">ITEM</th>
            <th className="text-right whitespace-nowrap px-1">QTD x UN</th>
            <th className="text-right whitespace-nowrap">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={i}>
              <td className="align-top pr-1">
                {item.name}
                {item.code && <div className="text-[8px] text-gray-600">{item.code}</div>}
              </td>
              <td className="text-right align-top px-1">
                {item.quantity} x {formatCurrency(item.unit_price).replace('R$', '')}
              </td>
              <td className="text-right align-top font-bold">
                {formatCurrency(item.total).replace('R$', '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTAIS */}
      <div className="border-t border-black border-dashed pt-2 space-y-1">
        <div className="flex justify-between font-bold text-xs">
          <span>TOTAL R$</span>
          <span>{formatCurrency(totalSale)}</span>
        </div>
        {discount > 0 && (
           <div className="flex justify-between text-[10px]">
             <span>Desconto</span>
             <span>-{formatCurrency(discount)}</span>
           </div>
        )}
        <div className="flex justify-between text-[10px]">
          <span>Dinheiro/Pgto</span>
          <span>{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Troco</span>
          <span>{formatCurrency(change)}</span>
        </div>
      </div>

      {/* FORMA DE PAGAMENTO */}
      <div className="mt-2 border-t border-black border-dashed pt-1">
         <p className="font-bold mb-1">Formas de Pagamento:</p>
         {sale.payments.map((p, i) => (
             <div key={i} className="flex justify-between uppercase">
                 <span>{safeRender(p.method)?.replace?.('_', ' ') || 'OUTROS'}</span>
                 <span>{formatCurrency(p.amount)}</span>
             </div>
         ))}
      </div>

      {/* RODAPÉ FISCAL / NÃO FISCAL */}
      <div className="mt-4 text-center border-t border-black pt-2">
          {customerCpf ? (
              <p className="mb-2">CONSUMIDOR CPF: {customerCpf}</p>
          ) : (
              <p className="mb-2 text-[9px]">CONSUMIDOR NÃO IDENTIFICADO</p>
          )}

          {isFiscal ? (
              <div className="flex flex-col items-center gap-2 mt-2">
                  {/* Espaço para QR Code Real */}
                  <div className="w-[25mm] h-[25mm] bg-white border border-black flex items-center justify-center">
                      {/* {url ? <QRCode value={invoice.url} size={80} /> : 'QR'} */}
                      <span className="text-[8px] font-bold">QR CODE</span>
                  </div>
                  <div className="text-center break-all w-full text-[8px] leading-tight px-2">
                      <p className="font-bold">Chave de Acesso:</p>
                      <p>{safeRender(invoice.access_key)}</p>
                      <p className="mt-1">Protocolo: {safeRender(invoice.protocol)}</p>
                  </div>
                  <p className="mt-1 font-bold">Consulte pela Chave de Acesso em<br/>www.sefaz.rs.gov.br (Exemplo)</p>
              </div>
          ) : (
              <div className="mt-2">
                  <p className="font-bold text-[9px]">*** É VEDADA A EMISSÃO DESTE ***<br/>*** COMO DOCUMENTO FISCAL ***</p>
                  <p className="text-[8px] mt-1 text-gray-500">Controle: {safeRender(sale.id)}</p>
              </div>
          )}
          
          <p className="mt-4 text-[8px]">Emissão: {formatDate(new Date())}</p>
          <p className="text-[8px]">SGM Marketfy • Tecnologia para Varejo</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
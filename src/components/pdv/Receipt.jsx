import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';

/**
 * Função utilitária para gerar e abrir o Cupom em PDF
 */
export const generateReceipt = (sale, marketInfo) => {
  if (!sale) {
    return toast.error("Dados da venda inválidos para impressão.");
  }

  try {
    // Configuração do documento: 80mm de largura (Padrão Térmico)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 300] 
    });

    doc.setFont("courier");
    doc.setFontSize(9);

    let y = 5; 
    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - (margin * 2);
    const lineHeight = 4;

    const centerText = (text, currentY) => {
        const textWidth = doc.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, currentY);
    };

    const leftRightText = (left, right, currentY) => {
        const rightWidth = doc.getTextWidth(right);
        const maxLeftWidth = contentWidth - rightWidth - 2; 
        let safeLeft = left;
        if (doc.getTextWidth(left) > maxLeftWidth) {
             const charWidth = doc.getTextWidth('A');
             const maxChars = Math.floor(maxLeftWidth / charWidth);
             safeLeft = left.substring(0, maxChars) + '..';
        }
        doc.text(safeLeft, margin, currentY);
        doc.text(right, pageWidth - margin - rightWidth, currentY);
    };

    const dashedLine = (currentY) => {
        doc.setLineDash([1, 1], 0);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.setLineDash([]); 
    };

    // 1. CABEÇALHO DA LOJA
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    const nameLines = doc.splitTextToSize(marketInfo?.name || "MERCADO", contentWidth);
    nameLines.forEach(line => { centerText(line, y); y += lineHeight; });

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    if (marketInfo?.address) {
        const addressLines = doc.splitTextToSize(marketInfo.address, contentWidth);
        addressLines.forEach(line => { centerText(line, y); y += lineHeight; });
    }
    if (marketInfo?.document) { centerText(`CNPJ: ${marketInfo.document}`, y); y += lineHeight; }

    y += 2; dashedLine(y); y += 4;

    // 2. IDENTIFICAÇÃO DO DOCUMENTO
    const isFiscal = sale.invoice && (sale.invoice.status === 'autorizada' || sale.invoice.status === 'AUTORIZADA');
    doc.setFont(undefined, 'bold');
    if (isFiscal) {
        centerText("DANFE NFC-e", y); y += lineHeight;
        centerText("Documento Auxiliar da Nota Fiscal", y); y += lineHeight;
        centerText("de Consumidor Eletrônica", y);
    } else {
        centerText("RECIBO DE VENDA", y); y += lineHeight;
        centerText("SEM VALOR FISCAL", y);
    }
    y += lineHeight + 2; doc.setFont(undefined, 'normal');

    // 3. LISTA DE ITENS
    doc.setFontSize(8);
    doc.text("ITEM", margin, y);
    doc.text("TOTAL", pageWidth - margin - doc.getTextWidth("TOTAL"), y);
    y += lineHeight; dashedLine(y - 1); y += 2;

    const items = sale.items || [];
    items.forEach((item, index) => {
        const productName = `${index + 1} ${item.name || item.product_name || 'Item Sem Nome'}`;
        const prodNameLines = doc.splitTextToSize(productName, contentWidth);
        prodNameLines.forEach(line => { doc.text(line, margin, y); y += lineHeight; });

        const qtd = parseFloat(item.quantity).toFixed(2);
        const unitPrice = formatCurrency(item.unit_price || 0).replace('R$', '').trim();
        const totalItem = formatCurrency(item.total || 0).replace('R$', '').trim();

        const detailLine = `${qtd} ${item.unit || 'UN'} x ${unitPrice}`;
        leftRightText(detailLine, totalItem, y);
        y += lineHeight + 1; 
    });

    dashedLine(y); y += 4;

    // 4. TOTAIS E PAGAMENTOS
    const total = parseFloat(sale.total_amount || sale.final_amount || 0);
    const discount = parseFloat(sale.discount || 0);
    const surcharge = parseFloat(sale.acrescimo || 0);
    
    const payments = sale.payments || [];
    const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    const change = Math.max(0, totalPaid - total);

    doc.setFont(undefined, 'bold');
    leftRightText("TOTAL R$", formatCurrency(total), y); y += lineHeight;

    if (discount > 0) { doc.setFont(undefined, 'normal'); leftRightText("Desconto", `-${formatCurrency(discount)}`, y); y += lineHeight; }
    if (surcharge > 0) { doc.setFont(undefined, 'normal'); leftRightText("Acréscimo", `+${formatCurrency(surcharge)}`, y); y += lineHeight; }
    
    y += 2;
    payments.forEach(pay => {
        const method = pay.method ? String(pay.method).toUpperCase().replace('_', ' ') : 'OUTROS';
        doc.setFont(undefined, 'normal');
        leftRightText(method, formatCurrency(pay.amount), y);
        y += lineHeight;
    });

    if (change > 0) {
        doc.setFont(undefined, 'bold');
        y += 1;
        leftRightText("TROCO R$", formatCurrency(change), y);
        y += lineHeight;
    }

    y += 2; dashedLine(y); y += 4;

    // 5. RODAPÉ E DADOS FISCAIS
    if (isFiscal) {
        doc.setFontSize(7);
        centerText("CONSULTE PELA CHAVE DE ACESSO EM:", y); y += lineHeight;
        centerText(sale.invoice.url_consulta || "www.sefaz.rs.gov.br", y); 
        y += lineHeight + 2;

        const key = sale.invoice.access_key || "0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000";
        const formattedKey = key.replace(/(.{4})/g, '$1 ').trim();
        const keyLines = doc.splitTextToSize(formattedKey, contentWidth);
        
        doc.setFont(undefined, 'bold');
        keyLines.forEach(l => { centerText(l, y); y += lineHeight; });
        
        y += 2; doc.setFont(undefined, 'normal');
        
        const cpf = sale.customer_cpf ? `CONSUMIDOR CPF: ${sale.customer_cpf}` : "CONSUMIDOR NÃO IDENTIFICADO";
        centerText(cpf, y); y += lineHeight;

        centerText(`NFC-e n ${sale.invoice.number || '0'} Série ${sale.invoice.series || '1'}`, y); y += lineHeight;
        centerText(`Protocolo: ${sale.invoice.protocol || '---'}`, y); y += lineHeight;
        centerText(`Autorização: ${formatDate(sale.invoice.authorized_at || new Date())}`, y);
        
        y += lineHeight + 2;
        doc.setLineWidth(0.1);
        doc.rect((pageWidth - 20)/2, y, 20, 20);
        centerText("QR CODE", y + 10); 
        y += 25;
    } else {
        doc.setFontSize(7);
        centerText("NÃO É DOCUMENTO FISCAL", y); y += lineHeight;
        if (sale.offline_id) { centerText(`ID Interno: ${sale.offline_id}`, y); y += lineHeight; }
        centerText(`Emissão: ${formatDate(new Date())}`, y);
    }
    
    y += 6;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(6);
    centerText("Sistema Marketfy • Tecnologia para Varejo", y);

    const pdfURL = doc.output('bloburl');
    window.open(pdfURL, '_blank');

  } catch (error) {
    console.error("Erro ao gerar cupom PDF:", error);
    toast.error("Erro ao gerar arquivo de impressão.");
  }
};

export const Receipt = ({ sale, marketInfo, className }) => {
    return (
        <button 
            onClick={() => generateReceipt(sale, marketInfo)}
            className={`flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-sm ${className}`}
            title="Gerar Cupom em PDF"
        >
            <Printer size={16} /> Imprimir Cupom
        </button>
    );
};
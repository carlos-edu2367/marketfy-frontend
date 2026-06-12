/* eslint-disable react-refresh/only-export-components */
import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';

const PAYMENT_METHOD_LABELS = {
  '01': 'DINHEIRO',
  '02': 'CHEQUE',
  '03': 'CARTAO CREDITO',
  '04': 'CARTAO DEBITO',
  '05': 'CREDITO LOJA',
  '10': 'VALE ALIMENTACAO',
  '11': 'VALE REFEICAO',
  '12': 'VALE PRESENTE',
  '13': 'VALE COMBUSTIVEL',
  '15': 'BOLETO',
  '16': 'DEPOSITO',
  '17': 'PIX',
  '18': 'TRANSFERENCIA',
  '19': 'FIDELIDADE',
  '90': 'SEM PAGAMENTO',
  '99': 'OUTROS',
};

const blankQrPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function buildQrDataUrl(value) {
  if (!value) return blankQrPng;
  try {
    const qrcode = await import('qrcode');
    return await qrcode.toDataURL(value, {
      margin: 0,
      width: 160,
      errorCorrectionLevel: 'M',
    });
  } catch {
    return blankQrPng;
  }
}

function formatAccessKey(key = '') {
  return String(key).replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function compactDate(value) {
  return value ? formatDate(value) : '---';
}

function issuerAddressLine(address = {}) {
  return [
    address.street,
    address.number,
    address.district,
    address.city,
    address.uf,
    address.zip_code,
  ].filter(Boolean).join(', ');
}

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

export const generateFiscalDanfe = async (payload) => {
  if (!payload) {
    return toast.error("Dados fiscais invalidos para impressao.");
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 320]
    });

    doc.setFont("courier");
    doc.setFontSize(9);

    let y = 5;
    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - (margin * 2);
    const lineHeight = 4;

    const centerText = (text, currentY) => {
      const safeText = String(text || '');
      const textWidth = doc.getTextWidth(safeText);
      doc.text(safeText, (pageWidth - textWidth) / 2, currentY);
    };

    const leftRightText = (left, right, currentY) => {
      const safeRight = String(right || '');
      const rightWidth = doc.getTextWidth(safeRight);
      const maxLeftWidth = contentWidth - rightWidth - 2;
      let safeLeft = String(left || '');
      if (doc.getTextWidth(safeLeft) > maxLeftWidth) {
        const charWidth = Math.max(doc.getTextWidth('A'), 1);
        const maxChars = Math.max(Math.floor(maxLeftWidth / charWidth), 1);
        safeLeft = `${safeLeft.substring(0, maxChars)}..`;
      }
      doc.text(safeLeft, margin, currentY);
      doc.text(safeRight, pageWidth - margin - rightWidth, currentY);
    };

    const dashedLine = (currentY) => {
      doc.setLineDash([1, 1], 0);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      doc.setLineDash([]);
    };

    const issuer = payload.issuer || {};
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.splitTextToSize(issuer.legal_name || "EMITENTE", contentWidth)
      .forEach(line => { centerText(line, y); y += lineHeight; });

    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    if (issuer.trade_name) {
      centerText(issuer.trade_name, y); y += lineHeight;
    }
    if (issuer.cnpj) {
      centerText(`CNPJ: ${issuer.cnpj}`, y); y += lineHeight;
    }
    if (issuer.state_registration) {
      centerText(`IE: ${issuer.state_registration}`, y); y += lineHeight;
    }
    const address = issuerAddressLine(issuer.address);
    if (address) {
      doc.splitTextToSize(address, contentWidth)
        .forEach(line => { centerText(line, y); y += lineHeight; });
    }

    y += 2; dashedLine(y); y += 4;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    centerText("DANFE NFC-e", y); y += lineHeight;
    centerText("Documento Auxiliar da Nota Fiscal", y); y += lineHeight;
    centerText("de Consumidor Eletronica", y); y += lineHeight;
    centerText(`NFC-e n ${payload.number || '---'} Serie ${payload.series || '---'}`, y);
    y += lineHeight + 2;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    centerText(`Emissao: ${compactDate(payload.issued_at)}`, y); y += lineHeight;
    centerText(`Autorizacao: ${compactDate(payload.authorized_at)}`, y); y += lineHeight;
    centerText(`Protocolo: ${payload.protocol || '---'}`, y); y += lineHeight + 2;

    dashedLine(y); y += 4;

    doc.setFont(undefined, 'bold');
    doc.text("ITEM", margin, y);
    doc.text("TOTAL", pageWidth - margin - doc.getTextWidth("TOTAL"), y);
    y += lineHeight; dashedLine(y - 1); y += 2;

    doc.setFont(undefined, 'normal');
    (payload.items || []).forEach((item, index) => {
      const productName = `${index + 1} ${item.description || 'Item sem descricao'}`;
      doc.splitTextToSize(productName, contentWidth)
        .forEach(line => { doc.text(line, margin, y); y += lineHeight; });

      const quantity = Number(item.quantity || 0).toFixed(3);
      const unitPrice = formatCurrency(Number(item.unit_amount || 0)).replace('R$', '').trim();
      const totalItem = formatCurrency(Number(item.total_amount || 0)).replace('R$', '').trim();
      leftRightText(`${quantity} ${item.unit || 'UN'} x ${unitPrice}`, totalItem, y);
      y += lineHeight + 1;
    });

    dashedLine(y); y += 4;

    doc.setFont(undefined, 'bold');
    leftRightText("TOTAL R$", formatCurrency(Number(payload.total_amount || 0)), y);
    y += lineHeight + 2;

    doc.setFont(undefined, 'normal');
    (payload.payments || []).forEach((payment) => {
      const label = PAYMENT_METHOD_LABELS[payment.method] || payment.method || 'OUTROS';
      leftRightText(label, formatCurrency(Number(payment.amount || 0)), y);
      y += lineHeight;
    });

    y += 2; dashedLine(y); y += 4;

    doc.setFontSize(7);
    centerText("CONSULTE PELA CHAVE DE ACESSO EM:", y); y += lineHeight;
    doc.splitTextToSize(payload.url_chave || '', contentWidth)
      .forEach(line => { centerText(line, y); y += lineHeight; });

    y += 2;
    doc.setFont(undefined, 'bold');
    doc.splitTextToSize(formatAccessKey(payload.access_key), contentWidth)
      .forEach(line => { centerText(line, y); y += lineHeight; });
    doc.setFont(undefined, 'normal');

    y += 2;
    const qrDataUrl = await buildQrDataUrl(payload.qr_code_url);
    const qrSize = 24;
    doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 4;

    doc.setFontSize(6);
    doc.splitTextToSize(payload.qr_code_url || '', contentWidth)
      .forEach(line => { centerText(line, y); y += 3; });

    if (payload.document?.environment === 'homologacao') {
      y += 2;
      doc.setFont(undefined, 'bold');
      centerText("EMITIDA EM HOMOLOGACAO - SEM VALOR FISCAL", y);
    }

    const pdfURL = doc.output('bloburl');
    window.open(pdfURL, '_blank');
  } catch (error) {
    console.error("Erro ao gerar DANFE NFC-e:", error);
    toast.error("Erro ao gerar DANFE NFC-e.");
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

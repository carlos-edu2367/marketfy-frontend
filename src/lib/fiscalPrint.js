import { getNfcePrintPayload } from './api';

const AUTHORIZED_STATUSES = new Set(['authorized', 'autorizada']);

export function isAuthorizedNfceInvoice(invoice) {
  const status = String(invoice?.status || '').toLowerCase();
  return AUTHORIZED_STATUSES.has(status);
}

export async function printAuthorizedNfce({ marketId, saleId }) {
  const { data } = await getNfcePrintPayload(marketId, saleId);
  const { generateFiscalDanfe } = await import('../components/pdv/Receipt');
  await generateFiscalDanfe(data);
  return data;
}

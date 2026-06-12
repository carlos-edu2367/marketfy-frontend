import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api', () => ({
  getNfcePrintPayload: vi.fn(),
}));

vi.mock('../components/pdv/Receipt', () => ({
  generateFiscalDanfe: vi.fn(),
}));

describe('fiscalPrint helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recognizes authorized invoice statuses from backend and legacy sales payloads', async () => {
    const { isAuthorizedNfceInvoice } = await import('../lib/fiscalPrint');

    expect(isAuthorizedNfceInvoice({ status: 'authorized' })).toBe(true);
    expect(isAuthorizedNfceInvoice({ status: 'autorizada' })).toBe(true);
    expect(isAuthorizedNfceInvoice({ status: 'processando' })).toBe(false);
    expect(isAuthorizedNfceInvoice(null)).toBe(false);
  });

  it('fetches print payload and sends it to fiscal DANFE generator', async () => {
    const { getNfcePrintPayload } = await import('../lib/api');
    const { generateFiscalDanfe } = await import('../components/pdv/Receipt');
    const { printAuthorizedNfce } = await import('../lib/fiscalPrint');

    const payload = { access_key: 'KEY', qr_code_url: 'https://qrcode' };
    getNfcePrintPayload.mockResolvedValue({ data: payload });

    await printAuthorizedNfce({ marketId: 'market-1', saleId: 'sale-1' });

    expect(getNfcePrintPayload).toHaveBeenCalledWith('market-1', 'sale-1');
    expect(generateFiscalDanfe).toHaveBeenCalledWith(payload);
  });
});

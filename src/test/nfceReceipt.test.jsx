import { beforeEach, describe, expect, it, vi } from 'vitest';

const doc = {
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  getTextWidth: vi.fn((text) => String(text).length),
  text: vi.fn(),
  splitTextToSize: vi.fn((text) => [String(text)]),
  setLineDash: vi.fn(),
  line: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  addImage: vi.fn(),
  output: vi.fn(() => 'blob:danfe'),
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function jsPDFMock() {
    return doc;
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('generateFiscalDanfe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn();
  });

  it('prints fiscal DANFE from authorized XML payload fields', async () => {
    const { generateFiscalDanfe } = await import('../components/pdv/Receipt');

    await generateFiscalDanfe({
      issuer: {
        legal_name: 'Mercado Teste Ltda',
        cnpj: '12345678000195',
        state_registration: '109876543',
        address: { street: 'Rua A', number: '123', city: 'Goiania', uf: 'GO' },
      },
      number: '21',
      series: '1',
      issued_at: '2026-06-12T18:00:00-03:00',
      authorized_at: '2026-06-12T18:00:05-03:00',
      protocol: '152260000000001',
      access_key: '52260612345678000195650010000000211000000210',
      qr_code_url: 'https://nfe.sefaz.go.gov.br/qrcode?p=52260612345678000195650010000000211000000210',
      url_chave: 'https://nfe.sefaz.go.gov.br/consulta',
      total_amount: '11.00',
      items: [
        {
          code: 'SKU-1',
          description: 'Refrigerante Cola',
          quantity: '2.0000',
          unit: 'UN',
          unit_amount: '5.50',
          total_amount: '11.00',
        },
      ],
      payments: [{ method: '03', amount: '11.00' }],
    });

    const printedText = doc.text.mock.calls.map((call) => call[0]).join('\n');
    expect(printedText).toContain('DANFE NFC-e');
    expect(printedText).toContain('Mercado Teste Ltda');
    expect(printedText).toContain('NFC-e n 21 Serie 1');
    expect(printedText).toContain('Protocolo: 152260000000001');
    expect(printedText).toContain('Refrigerante Cola');
    expect(printedText).toContain('https://nfe.sefaz.go.gov.br/consulta');
    expect(doc.addImage).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('blob:danfe', '_blank');
  });
});

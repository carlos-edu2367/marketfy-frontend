import { describe, expect, it } from 'vitest';
import { getCompanyInfo } from '../lib/company';

describe('getCompanyInfo', () => {
  it('returns null for every field that is not configured', () => {
    expect(getCompanyInfo({})).toEqual({ legalName: null, cnpj: null, address: null, salesContactUrl: null });
  });

  it('trims configured values and treats blanks as missing', () => {
    expect(getCompanyInfo({
      VITE_COMPANY_LEGAL_NAME: '  Marketfy Tecnologia LTDA ',
      VITE_COMPANY_CNPJ: '00.000.000/0001-00',
      VITE_COMPANY_ADDRESS: '   ',
      VITE_SALES_CONTACT_URL: 'https://wa.me/5500000000000',
    })).toEqual({
      legalName: 'Marketfy Tecnologia LTDA',
      cnpj: '00.000.000/0001-00',
      address: null,
      salesContactUrl: 'https://wa.me/5500000000000',
    });
  });
});

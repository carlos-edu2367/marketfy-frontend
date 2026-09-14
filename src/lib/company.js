const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * Dados da empresa exigidos no rodape (Decreto 7.962/2013) e canal de vendas
 * do plano sob medida. Vem sempre de variaveis de ambiente: sem valor
 * configurado, a tela esconde o bloco em vez de mostrar dado inventado.
 */
export function getCompanyInfo(source = import.meta.env) {
  return {
    legalName: clean(source.VITE_COMPANY_LEGAL_NAME),
    cnpj: clean(source.VITE_COMPANY_CNPJ),
    address: clean(source.VITE_COMPANY_ADDRESS),
    salesContactUrl: clean(source.VITE_SALES_CONTACT_URL),
  };
}

import { requestInvoiceCheckout } from './api';

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : ms));

/**
 * Pede o checkout de uma fatura e espera o link ficar pronto. O checkout e
 * assincrono no Billing Core; repetir POST /billing/invoices/{id}/checkout so
 * consulta o job existente depois da primeira criacao, nao cobra de novo.
 * Retorna null se o link nao ficar pronto dentro das tentativas.
 */
export async function fetchInvoiceCheckoutUrl(invoiceId) {
  const { data } = await requestInvoiceCheckout(invoiceId);
  let url = data?.checkout_url || null;

  for (let attempt = 0; !url && attempt < POLL_ATTEMPTS; attempt += 1) {
    await wait(POLL_INTERVAL_MS);
    const response = await requestInvoiceCheckout(invoiceId);
    url = response.data?.checkout_url || null;
  }

  return url;
}

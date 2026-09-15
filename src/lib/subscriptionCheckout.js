import { ensureSubscriptionCheckout } from './api';

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : ms));

/**
 * Confirma o checkout de uma assinatura recorrente e espera o link ficar
 * pronto. O checkout e assincrono no Billing Core; repetir POST
 * /billing/subscriptions/{id}/checkout so consulta o job existente depois
 * da primeira criacao, nao cria outra assinatura. Retorna null se o link
 * nao ficar pronto dentro das tentativas.
 */
export async function fetchSubscriptionCheckoutUrl(subscriptionId) {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const { data } = await ensureSubscriptionCheckout(subscriptionId);
    if (data?.checkout_url) return data.checkout_url;
    await wait(POLL_INTERVAL_MS);
  }
  return null;
}

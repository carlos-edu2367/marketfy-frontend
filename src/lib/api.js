import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getApiErrorMessage(error, fallback = 'Nao foi possivel concluir a operacao.') {
  const status = error.response?.status;
  const payload = error.response?.data;
  const detail = payload?.detail || payload?.error?.message;

  if (status === 403) return 'Voce nao tem permissao para acessar este recurso.';
  if (status === 422) {
    const validationDetails = payload?.error?.details || detail;
    if (Array.isArray(validationDetails)) return validationDetails.map(item => item.msg).join(' ');
    return validationDetails || 'Revise os campos informados.';
  }
  if (status === 429) return detail || 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return detail || fallback;
}

export const getFiscalPackages = () =>
  api.get('/fiscal/credits/packages');

export const initiateCreditPurchase = (marketId, packageSlug, idempotencyKey) =>
  api.post(`/fiscal/${marketId}/credits/checkout`, {
    package_slug: packageSlug,
    idempotency_key: idempotencyKey,
  });

export const getFiscalCreditsBalance = (marketId) =>
  api.get(`/fiscal/${marketId}/credits/balance`);

export const getFiscalCreditsHistory = (marketId, page = 1, perPage = 10) =>
  api.get(`/fiscal/${marketId}/credits/history`, {
    params: { page, per_page: perPage },
  });

export const getNfcePrintPayload = (marketId, saleId) =>
  api.get(`/fiscal/${marketId}/sales/${saleId}/nfce/print`);

// Product tax rules are explicit and evidence-backed. These helpers intentionally
// receive full payloads from the fiscal workflow; they never derive tax codes from
// product text, EAN or the NCM stored in the commercial catalog.
export const getTaxRulePendencies = (marketId) =>
  api.get(`/fiscal/${marketId}/tax-rule-pendencies`);

export const getTaxRules = (marketId) =>
  api.get(`/fiscal/${marketId}/tax-rules`);

export const createTaxRuleDraft = (marketId, payload) =>
  api.post(`/fiscal/${marketId}/tax-rules`, payload);

export const publishTaxRule = (marketId, ruleId, payload) =>
  api.post(`/fiscal/${marketId}/tax-rules/${ruleId}/publish`, payload);

export const assignProductsTaxRule = (marketId, payload) =>
  api.post(`/inventory/${marketId}/products/tax-rule-assignment`, payload);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.metadata = { startTime: Date.now() };
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise || api.post('/auth/refresh');
        const { data } = await refreshPromise;
        refreshPromise = null;
        setAccessToken(data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        if (!originalRequest.url?.includes('/auth/refresh')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

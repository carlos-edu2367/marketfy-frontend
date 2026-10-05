import api from './api';

export const FUNNEL_MESSAGE_SOURCE = 'marketfy-funnel';
export const SANDBOX = 'allow-scripts allow-forms allow-popups';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CHECKOUT_KEY = 'funnel_fsid';
const ACTIONS = new Set(['next', 'back', 'finish']);

export const FUNNEL_HELPER_SCRIPT = `<script>(function(){
function send(t){parent.postMessage({source:'${FUNNEL_MESSAGE_SOURCE}',type:t},'*');}
window.Funnel={next:function(){send('next');},back:function(){send('back');},finish:function(){send('finish');}};
document.addEventListener('click',function(e){
var el=e.target&&e.target.closest&&e.target.closest('[data-funnel-next],[data-funnel-back],[data-funnel-finish]');
if(!el)return;e.preventDefault();
if(el.hasAttribute('data-funnel-next'))send('next');else if(el.hasAttribute('data-funnel-back'))send('back');else send('finish');
});})();</script>`;

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const readFsid = (slug) => safe(() => localStorage.getItem(`funnel:${slug}`));
export const saveFsid = (slug, fsid) => safe(() => localStorage.setItem(`funnel:${slug}`, fsid));
export const rememberCheckoutFsid = (fsid) => safe(() => sessionStorage.setItem(CHECKOUT_KEY, fsid));
export const readCheckoutFsid = () => safe(() => sessionStorage.getItem(CHECKOUT_KEY));
export const clearCheckoutFsid = () => safe(() => sessionStorage.removeItem(CHECKOUT_KEY));

export function readUtms(search) {
  const params = new URLSearchParams(search);
  return UTM_KEYS.reduce((acc, key) => {
    const value = params.get(key);
    if (value) acc[key] = value;
    return acc;
  }, {});
}

export function buildSrcdoc({ html, trackingHtml }) {
  return `<!doctype html><html><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `${trackingHtml || ''}${FUNNEL_HELPER_SCRIPT}</head><body>${html || ''}</body></html>`;
}

export function parseFunnelMessage(event, frameWindow) {
  if (!frameWindow || event.source !== frameWindow) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || data.source !== FUNNEL_MESSAGE_SOURCE) return null;
  return ACTIONS.has(data.type) ? data.type : null;
}

export function finishUrl({ planId, fsid, loggedIn }) {
  const params = new URLSearchParams();
  if (planId) params.set('plan', planId);
  params.set('fsid', fsid);
  return `${loggedIn ? '/plans' : '/register'}?${params.toString()}`;
}

// Chamadas simultâneas (StrictMode, remount) compartilham a mesma requisição,
// senão cada uma cria uma sessão e a 2ª fica órfã, inflando as visitas.
const inflightSessions = new Map();
export const startFunnelSession = (slug, body) => {
  const key = `${slug}:${body?.fsid || ''}`;
  if (!inflightSessions.has(key)) {
    const request = api
      .post(`/funnels/public/${encodeURIComponent(slug)}/session`, body)
      .then((r) => r.data)
      .finally(() => inflightSessions.delete(key));
    inflightSessions.set(key, request);
  }
  return inflightSessions.get(key);
};

export const getFunnelPreview = (variantId) =>
  api.get(`/admin/funnels/variants/${variantId}/preview`).then((r) => r.data);

export async function sendFunnelEvent(body) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await api.post('/funnels/public/events', body);
      return;
    } catch {
      // segue para a próxima tentativa; depois desiste em silêncio
    }
  }
}

const claimedSessions = new Set();

export async function claimFunnelSession(fsid) {
  // Efeitos repetidos (StrictMode, re-render) não devem reenviar o claim.
  if (!fsid || claimedSessions.has(fsid)) return;
  claimedSessions.add(fsid);
  try {
    await api.post(`/funnels/sessions/${fsid}/claim`);
    forgetFunnelSession(fsid);
  } catch {
    claimedSessions.delete(fsid);
    // atribuição nunca bloqueia o checkout
  }
}

/** fsid de funil: a URL tem prioridade; senão, o guardado na sessão (vindo do funil/cadastro). */
export function resolveCheckoutFsid(search) {
  return new URLSearchParams(search).get('fsid') || readCheckoutFsid();
}

// Depois do cadastro a sessão do funil já foi consumida: em aparelho compartilhado
// o próximo cadastro não deve herdar o fsid (nem os utm_*) do anterior.
export const forgetFunnelSession = (fsid) =>
  safe(() => {
    clearCheckoutFsid();
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('funnel:') && (!fsid || localStorage.getItem(key) === fsid)) localStorage.removeItem(key);
    }
  });

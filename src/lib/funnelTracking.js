import posthog from 'posthog-js';
import { track } from './analytics';
import { createFunnelEvent } from './marketingFunnelApi';

const VISITOR_ID_KEY = 'marketfy_funnel_visitor_id';
const CONSENT_KEY = 'marketfy_cookie_consent';

function hasConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

/**
 * Id anônimo do visitante do funil. Reaproveita o distinct_id do PostHog
 * quando ele já estiver carregado (liga os dois sistemas); cai para um id
 * local persistido em localStorage quando não.
 */
export function getFunnelVisitorId() {
  try {
    const posthogId = posthog.get_distinct_id && posthog.get_distinct_id();
    if (posthogId) return posthogId;
  } catch {
    // posthog ainda não inicializado — segue com o id local
  }

  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Dispara o mesmo evento no PostHog e no backend próprio (fonte do painel
 * admin). Nunca lança: falha de rede no tracking não pode travar o funil.
 */
export function trackFunnelEvent(eventName, { funnelVariant, step, ...properties } = {}) {
  if (!hasConsent()) return;

  track(eventName, { funnel_variant: funnelVariant, step, ...properties });

  createFunnelEvent({
    visitor_id: getFunnelVisitorId(),
    funnel_variant: funnelVariant,
    event_name: eventName,
    step: step || null,
    properties: Object.keys(properties).length ? properties : null,
  }).catch(() => {
    // tracking nunca pode travar o funil
  });
}

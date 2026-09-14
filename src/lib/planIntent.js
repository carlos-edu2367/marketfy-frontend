const STORAGE_KEY = 'marketfy_plan_intent';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const VALID_CYCLES = ['monthly', 'semiannual', 'annual'];

const normalizeCycle = (cycle) => (VALID_CYCLES.includes(cycle) ? cycle : 'monthly');

/** Guarda o plano escolhido na landing (?plan=&cycle=) para retomar em /plans. */
export function savePlanIntent({ planId, cycle }, now = Date.now()) {
  if (!planId) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ planId, cycle: normalizeCycle(cycle), savedAt: now }));
  } catch {
    // storage indisponivel (modo privado, bloqueio do navegador): segue sem intencao.
  }
}

export function readPlanIntent(now = Date.now()) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.planId || typeof parsed.savedAt !== 'number' || now - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { planId: parsed.planId, cycle: normalizeCycle(parsed.cycle) };
  } catch {
    return null;
  }
}

export function clearPlanIntent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada a limpar
  }
}

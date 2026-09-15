# Funis A/B de Conversão — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar no ar `/funil-a` (diagnóstico, 11 perguntas) e `/funil-b` (dia do mercado, 5 cenários) como páginas reais do Marketfy — conteúdo e lógica dos protótipos preservados, estilo trocado pra paleta real do produto, preço/oferta vindos da API de planos, lead capturado de verdade, e um painel em `/admin/funis` mostrando conversão por etapa e leads, por variante.

**Architecture:** Duas páginas autocontidas (`FunilDiagnostico.jsx`, `FunilDiaDoMercado.jsx`) — sem motor de funil genérico, porque as duas estruturas (perguntas objetivas vs. cenários com pontuação) divergem demais pra uma abstração comum valer a pena com só 2 funis. Componentes visuais repetidos (barra de progresso, anel de score, painel de oferta) viram `src/components/marketing/*`. Cada troca de tela dispara `track()` do PostHog (já existe) e um `POST` pro backend novo (`lib/funnelTracking.js`), os dois só depois de consentimento de cookies.

**Tech Stack:** React 18, React Router v6, Tailwind, `usePublicPlans`/`lib/pricing.js` (já existem), `recharts` (painel admin), Vitest + Testing Library.

**Spec:** `backend/docs/superpowers/specs/2026-09-15-funis-ab-conversao-design.md`
**Backend plan (mesma feature, já implementado antes deste):** `backend/docs/superpowers/plans/2026-09-15-funis-ab-conversao-backend.md`

## Global Constraints

- Paleta: `brand.yellow` (#FACC15) para ação primária, `brand.dark` (#1F2937), `brand.green` (#16A34A) para sucesso/confiança, fundo branco/`brand.gray` — nunca os tons dos protótipos originais (verde-oliva/creme no B, azul-marinho no A). As duas páginas usam o MESMO tema claro do resto do Marketfy.
- Preço da oferta sempre vem de `usePublicPlans()` (fonte real, `GET /identity/plans`) — nunca hardcoded. A âncora "de R$ 997,00/mês" é copy fixo (história real de um cliente, não vem da API).
- CTA final sempre `/register?plan={id}&cycle=monthly`, nunca `alert()`.
- Vocabulário de eventos (idêntico em PostHog e no backend próprio): `marketfy_funnel_start`, `marketfy_funnel_step_view` (com `step`), `marketfy_lead_submit`, `marketfy_offer_view`, `marketfy_offer_cta_click`, `marketfy_offer_decline`, `marketfy_downsell_cta_click`.
- Tracking (PostHog e backend) só dispara se `localStorage['marketfy_cookie_consent'] === 'accepted'` — mesma regra já usada em `App.jsx`/`CookieConsentBanner.jsx`. As páginas de funil renderizam `<CookieConsentBanner />` (não estão atrás da Home, que é o único lugar que a renderiza hoje).
- Falha de rede no tracking (evento ou lead) nunca pode travar o funil — sempre `.catch()` silencioso, o usuário segue navegando.

---

### Task 1: Cliente de API e tracking do funil

**Files:**
- Create: `src/lib/marketingFunnelApi.js`
- Create: `src/lib/funnelTracking.js`
- Test: `src/test/funnelTracking.test.js`

**Interfaces:**
- Produces: `createFunnelEvent(payload)`, `createFunnelLead(payload)`, `getMarketingFunnelSummary()`, `getMarketingFunnelLeads(variant)` (todas em `marketingFunnelApi.js`); `getFunnelVisitorId(): string` e `trackFunnelEvent(eventName: string, { funnelVariant, step, ...properties }): void` (em `funnelTracking.js`) — usados por todas as páginas de funil (Tasks 3-6).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/funnelTracking.test.js`:

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackMock = vi.fn();
const createFunnelEventMock = vi.fn().mockResolvedValue({});
const posthogMock = { get_distinct_id: vi.fn() };

vi.mock('posthog-js', () => ({ default: posthogMock }));
vi.mock('../lib/analytics', () => ({ track: trackMock }));
vi.mock('../lib/marketingFunnelApi', () => ({ createFunnelEvent: createFunnelEventMock }));

describe('lib/funnelTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    posthogMock.get_distinct_id.mockReturnValue(undefined);
  });

  afterEach(() => localStorage.clear());

  it('does nothing without cookie consent', async () => {
    const { trackFunnelEvent } = await import('../lib/funnelTracking');
    trackFunnelEvent('marketfy_funnel_start', { funnelVariant: 'A' });
    expect(trackMock).not.toHaveBeenCalled();
    expect(createFunnelEventMock).not.toHaveBeenCalled();
  });

  it('tracks on posthog and on the backend once consent is accepted', async () => {
    localStorage.setItem('marketfy_cookie_consent', 'accepted');
    const { trackFunnelEvent } = await import('../lib/funnelTracking');

    trackFunnelEvent('marketfy_funnel_step_view', { funnelVariant: 'A', step: 'q1' });

    expect(trackMock).toHaveBeenCalledWith('marketfy_funnel_step_view', {
      funnel_variant: 'A',
      step: 'q1',
    });
    expect(createFunnelEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        funnel_variant: 'A',
        event_name: 'marketfy_funnel_step_view',
        step: 'q1',
      })
    );
  });

  it('reuses the same visitor id across calls', async () => {
    const { getFunnelVisitorId } = await import('../lib/funnelTracking');
    const first = getFunnelVisitorId();
    const second = getFunnelVisitorId();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(8);
  });

  it('prefers the posthog distinct id when available', async () => {
    posthogMock.get_distinct_id.mockReturnValue('ph-distinct-1');
    const { getFunnelVisitorId } = await import('../lib/funnelTracking');
    expect(getFunnelVisitorId()).toBe('ph-distinct-1');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- funnelTracking`
Expected: FAIL — `Cannot find module '../lib/funnelTracking'` (arquivo ainda não existe).

- [ ] **Step 3: Implementar `marketingFunnelApi.js`**

Criar `src/lib/marketingFunnelApi.js`:

```js
import api from './api';

export const createFunnelEvent = (payload) => api.post('/marketing-funnel/events', payload);

export const createFunnelLead = (payload) => api.post('/marketing-funnel/leads', payload);

export const getMarketingFunnelSummary = () => api.get('/admin/marketing-funnel/summary');

export const getMarketingFunnelLeads = (variant) =>
  api.get('/admin/marketing-funnel/leads', { params: variant ? { variant } : {} });
```

- [ ] **Step 4: Implementar `funnelTracking.js`**

Criar `src/lib/funnelTracking.js`:

```js
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
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test -- funnelTracking`
Expected: PASS (4 testes)

- [ ] **Step 6: Commit**

```bash
git add src/lib/marketingFunnelApi.js src/lib/funnelTracking.js src/test/funnelTracking.test.js
git commit -m "feat: add marketing funnel API client and dual PostHog/backend tracking"
```

---

### Task 2: Componentes visuais compartilhados (barra de progresso e anel de score)

**Files:**
- Create: `src/components/marketing/FunnelProgressBar.jsx`
- Create: `src/components/marketing/FunnelScoreRing.jsx`
- Test: `src/test/funnelSharedComponents.test.jsx`

**Interfaces:**
- Produces: `<FunnelProgressBar current={number} total={number} label={string} />`, `<FunnelScoreRing score={number} label?={string} />` — usados pelas Tasks 4 e 5.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/funnelSharedComponents.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FunnelProgressBar from '../components/marketing/FunnelProgressBar';
import FunnelScoreRing from '../components/marketing/FunnelScoreRing';

describe('FunnelProgressBar', () => {
  it('shows the current step label and computed percentage', () => {
    render(<FunnelProgressBar current={3} total={5} label="pergunta 3 de 5" />);
    expect(screen.getByText('pergunta 3 de 5')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});

describe('FunnelScoreRing', () => {
  it('shows the score and the default label', () => {
    render(<FunnelScoreRing score={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('controle / 100')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- funnelSharedComponents`
Expected: FAIL — módulos não existem.

- [ ] **Step 3: Implementar `FunnelProgressBar.jsx`**

Criar `src/components/marketing/FunnelProgressBar.jsx`:

```jsx
export default function FunnelProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-10 -mx-5 bg-white/90 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-yellow transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs font-medium text-gray-400">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implementar `FunnelScoreRing.jsx`**

Criar `src/components/marketing/FunnelScoreRing.jsx`:

```jsx
export default function FunnelScoreRing({ score, label = 'controle / 100' }) {
  return (
    <div
      className="relative grid aspect-square w-40 shrink-0 place-items-center rounded-full sm:w-44"
      style={{ background: `conic-gradient(#FACC15 ${score}%, #F3F4F6 0)` }}
    >
      <div className="absolute inset-3 rounded-full bg-white" />
      <div className="relative text-center">
        <div className="text-4xl font-black tracking-tight text-gray-950">{score}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test -- funnelSharedComponents`
Expected: PASS (2 testes)

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/FunnelProgressBar.jsx src/components/marketing/FunnelScoreRing.jsx src/test/funnelSharedComponents.test.jsx
git commit -m "feat: add shared funnel progress bar and score ring components"
```

---

### Task 3: Painel de oferta (plano real + downsell)

**Files:**
- Create: `src/components/marketing/FunnelOfferPanel.jsx`
- Test: `src/test/funnelOfferPanel.test.jsx`

**Interfaces:**
- Consumes: `usePublicPlans()` (`src/hooks/usePublicPlans.js`), `getRecommendedPlanId`/`getMonthlyEquivalent` (`src/lib/pricing.js`), `formatCurrency` (`src/lib/utils.js`), `trackFunnelEvent` (Task 1).
- Produces: `<FunnelOfferPanel funnelVariant="A" | "B" />` — usado pelas Tasks 4 e 5 depois que o lead é capturado.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/funnelOfferPanel.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunnelOfferPanel from '../components/marketing/FunnelOfferPanel';
import api from '../lib/api';
import { trackFunnelEvent } from '../lib/funnelTracking';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../lib/funnelTracking', () => ({ trackFunnelEvent: vi.fn() }));

const plans = [
  {
    id: 'plan-basic', name: 'Básico', type: 'pago', is_active: true,
    max_markets: 1, max_terminals: 1, fiscal_monthly_limit: 0,
    price_monthly: '129.90', price_180days: '699.90', price_annual: '1299.90',
  },
  {
    id: 'plan-pro', name: 'Pro', type: 'pago', is_active: true, is_recommended: true,
    max_markets: 3, max_terminals: 6, fiscal_monthly_limit: 300,
    price_monthly: '259.90', price_180days: '1399.90', price_annual: '2599.90',
  },
];

const renderPanel = () =>
  render(
    <MemoryRouter>
      <FunnelOfferPanel funnelVariant="A" />
    </MemoryRouter>
  );

describe('FunnelOfferPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: plans });
  });

  it('shows the recommended plan with the real price and a CTA to register', async () => {
    renderPanel();

    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('259,90')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /quero o pro/i })).toHaveAttribute(
      'href',
      '/register?plan=plan-pro&cycle=monthly'
    );
  });

  it('tracks offer_view on mount and offer_cta_click on the main CTA', async () => {
    renderPanel();
    await screen.findByText('Pro');

    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_offer_view', { funnelVariant: 'A' });

    await userEvent.click(screen.getByRole('link', { name: /quero o pro/i }));
    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_offer_cta_click', {
      funnelVariant: 'A',
      plan_id: 'plan-pro',
    });
  });

  it('reveals the downsell plan when declining the main offer', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Pro');

    await user.click(screen.getByRole('button', { name: /algo mais enxuto/i }));

    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /escolher básico/i })).toHaveAttribute(
      'href',
      '/register?plan=plan-basic&cycle=monthly'
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- funnelOfferPanel`
Expected: FAIL — `Cannot find module '../components/marketing/FunnelOfferPanel'`.

- [ ] **Step 3: Implementar `FunnelOfferPanel.jsx`**

Criar `src/components/marketing/FunnelOfferPanel.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePublicPlans } from '../../hooks/usePublicPlans';
import { getRecommendedPlanId, getMonthlyEquivalent } from '../../lib/pricing';
import { formatCurrency } from '../../lib/utils';
import { trackFunnelEvent } from '../../lib/funnelTracking';

const OFFER_FEATURES = [
  'PDV offline-first',
  'Estoque integrado',
  'Emissão fiscal integrada',
  'Controle de fiado',
  'Controle financeiro',
  'Dashboard financeiro',
];

export default function FunnelOfferPanel({ funnelVariant }) {
  const { plans, loading } = usePublicPlans();
  const [showDownsell, setShowDownsell] = useState(false);

  const recommendedId = getRecommendedPlanId(plans);
  const recommendedPlan = plans.find((plan) => plan.id === recommendedId) || plans[0] || null;
  const basicPlan = plans
    .filter((plan) => plan.id !== recommendedPlan?.id)
    .sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0))[0] || null;

  useEffect(() => {
    if (!loading && recommendedPlan) {
      trackFunnelEvent('marketfy_offer_view', { funnelVariant });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recommendedPlan?.id]);

  if (loading || !recommendedPlan) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando oferta">
        <Loader2 className="animate-spin text-brand-yellow" size={36} />
      </div>
    );
  }

  const monthlyPrice = getMonthlyEquivalent(recommendedPlan, 'monthly');

  return (
    <div className="mt-8">
      <div className="grid overflow-hidden rounded-3xl border border-gray-200 shadow-xl md:grid-cols-2">
        <div className="bg-white p-7 sm:p-8">
          <span className="inline-flex rounded-full bg-lime-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-green">
            Configuração recomendada
          </span>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-gray-950">{recommendedPlan.name}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Você não precisa de "mais uma tela de vendas". Precisa de uma operação que continue
            funcionando e gere informação pra decisão.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm">
            {OFFER_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-gray-700">
                <Check size={15} className="shrink-0 text-brand-green" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center bg-gray-950 p-7 text-white sm:p-8">
          <div className="text-xs text-gray-400">
            Valor de referência do pacote
            <br />
            <s>R$ 997,00/mês</s>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold opacity-70">R$</span>
            <span className="text-5xl font-black tracking-tight">
              {monthlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold opacity-70">/mês</span>
          </div>
          <Button
            as={Link}
            to={`/register?plan=${recommendedPlan.id}&cycle=monthly`}
            onClick={() => trackFunnelEvent('marketfy_offer_cta_click', { funnelVariant, plan_id: recommendedPlan.id })}
            className="mt-5 h-12 w-full font-bold"
          >
            Quero o {recommendedPlan.name} <ArrowRight size={18} />
          </Button>
          {basicPlan && !showDownsell && (
            <button
              type="button"
              onClick={() => {
                setShowDownsell(true);
                trackFunnelEvent('marketfy_offer_decline', { funnelVariant });
              }}
              className="mt-3 text-xs text-gray-400 underline underline-offset-4 hover:text-gray-200"
            >
              Quero começar com algo mais enxuto
            </button>
          )}
        </div>
      </div>

      {basicPlan && showDownsell && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
            Plano de entrada
          </span>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-black text-gray-950">{basicPlan.name}</h4>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Mesma base operacional, com menor capacidade de emissões fiscais e sem dashboard
                financeiro avançado.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-gray-950">
                {formatCurrency(getMonthlyEquivalent(basicPlan, 'monthly'))}
                <span className="text-sm font-bold text-gray-400">/mês</span>
              </div>
              <Button
                as={Link}
                to={`/register?plan=${basicPlan.id}&cycle=monthly`}
                onClick={() => trackFunnelEvent('marketfy_downsell_cta_click', { funnelVariant, plan_id: basicPlan.id })}
                className="mt-2 font-bold"
              >
                Escolher {basicPlan.name}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- funnelOfferPanel`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/FunnelOfferPanel.jsx src/test/funnelOfferPanel.test.jsx
git commit -m "feat: add funnel offer panel with real plan pricing and downsell"
```

---

### Task 4: Funil B — "Dia do mercado" (`/funil-b`)

**Files:**
- Create: `src/pages/marketing/FunilDiaDoMercado.jsx`
- Modify: `src/App.jsx`
- Test: `src/test/funilDiaDoMercado.test.jsx`

**Interfaces:**
- Consumes: `FunnelProgressBar`, `FunnelScoreRing`, `FunnelOfferPanel` (Tasks 2-3), `trackFunnelEvent`/`getFunnelVisitorId` (Task 1), `createFunnelLead` (Task 1), `CookieConsentBanner` (`src/components/CookieConsentBanner.jsx`, já existe), `Input`/`Button` (`src/components/ui`).
- Produces: rota pública `/funil-b`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/funilDiaDoMercado.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunilDiaDoMercado from '../pages/marketing/FunilDiaDoMercado';
import { createFunnelLead } from '../lib/marketingFunnelApi';
import { trackFunnelEvent, getFunnelVisitorId } from '../lib/funnelTracking';

vi.mock('../lib/marketingFunnelApi', () => ({
  createFunnelLead: vi.fn().mockResolvedValue({}),
}));
vi.mock('../lib/funnelTracking', () => ({
  trackFunnelEvent: vi.fn(),
  getFunnelVisitorId: vi.fn().mockReturnValue('visitor-b-1'),
}));
vi.mock('../components/marketing/FunnelOfferPanel', () => ({
  default: ({ funnelVariant }) => <div data-testid="offer-panel">oferta {funnelVariant}</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <FunilDiaDoMercado />
    </MemoryRouter>
  );

describe('FunilDiaDoMercado (/funil-b)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts the funnel and tracks the first step', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /simular meu dia/i }));

    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_funnel_start', { funnelVariant: 'B' });
    expect(screen.getByText(/a internet oscila/i)).toBeInTheDocument();
  });

  it('walks through the 5 scenarios and reaches the final screen with a score', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /simular meu dia/i }));

    await user.click(screen.getByRole('button', { name: /continuamos vendendo/i }));
    await user.click(screen.getByRole('button', { name: /confio bastante/i }));
    await user.click(screen.getByRole('button', { name: /no próprio sistema/i }));
    await user.click(screen.getByRole('button', { name: /já sai pelo fluxo do pdv/i }));
    await user.click(screen.getByRole('button', { name: /sim\. tenho visão consolidada/i }));

    expect(await screen.findByText(/resultado do teste/i)).toBeInTheDocument();
  });

  it('requires name and phone before submitting the lead, then shows the offer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /simular meu dia/i }));
    await user.click(screen.getByRole('button', { name: /continuamos vendendo/i }));
    await user.click(screen.getByRole('button', { name: /confio bastante/i }));
    await user.click(screen.getByRole('button', { name: /no próprio sistema/i }));
    await user.click(screen.getByRole('button', { name: /já sai pelo fluxo do pdv/i }));
    await user.click(screen.getByRole('button', { name: /sim\. tenho visão consolidada/i }));

    await user.click(screen.getByRole('button', { name: /ver plano indicado/i }));
    expect(screen.getByText(/preencha nome e whatsapp/i)).toBeInTheDocument();
    expect(createFunnelLead).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana');
    await user.type(screen.getByPlaceholderText('WhatsApp'), '11999990000');
    await user.click(screen.getByRole('button', { name: /ver plano indicado/i }));

    expect(await screen.findByTestId('offer-panel')).toHaveTextContent('oferta B');
    expect(createFunnelLead).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_id: 'visitor-b-1', funnel_variant: 'B', name: 'Ana', phone: '11999990000' })
    );
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'marketfy_lead_submit',
      expect.objectContaining({ funnelVariant: 'B' })
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- funilDiaDoMercado`
Expected: FAIL — `Cannot find module '../pages/marketing/FunilDiaDoMercado'`.

- [ ] **Step 3: Implementar `FunilDiaDoMercado.jsx`**

Criar `src/pages/marketing/FunilDiaDoMercado.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react';
import FunnelProgressBar from '../../components/marketing/FunnelProgressBar';
import FunnelScoreRing from '../../components/marketing/FunnelScoreRing';
import FunnelOfferPanel from '../../components/marketing/FunnelOfferPanel';
import CookieConsentBanner from '../../components/CookieConsentBanner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { trackFunnelEvent, getFunnelVisitorId } from '../../lib/funnelTracking';
import { createFunnelLead } from '../../lib/marketingFunnelApi';

const FUNNEL_VARIANT = 'B';

const SCENARIOS = [
  {
    id: 's1',
    time: '08:17',
    title: 'A internet oscila e começa a formar fila no caixa.',
    story:
      'Tem gente entrando para comprar pão, café, cigarro, leite — justamente no horário em que alguns clientes estão com pressa. O que acontece no seu caixa se a conexão cair?',
    painKey: 'offline',
    choices: [
      { label: 'Continuamos vendendo', sub: 'O PDV funciona sem depender da internet.', pain: 0 },
      { label: 'Fica mais lento / improvisamos', sub: 'Tem contingência, mas não é simples.', pain: 2 },
      { label: 'O caixa praticamente para', sub: 'Precisamos esperar a conexão voltar.', pain: 5, danger: true },
    ],
  },
  {
    id: 's2',
    time: '11:42',
    title: 'Um cliente procura um item que "consta no sistema", mas ninguém acha na prateleira.',
    story:
      'O funcionário olha no estoque, pergunta pra outro funcionário e começa a conferir caixa. O cliente espera. Quanto você confia na quantidade exibida no seu sistema hoje?',
    painKey: 'stock',
    choices: [
      { label: 'Confio bastante', sub: 'Entrada, venda e baixa ficam sincronizadas.', pain: 0 },
      { label: 'Mais ou menos', sub: 'Tem diferença que exige conferência manual.', pain: 3 },
      { label: 'Confio pouco', sub: 'O estoque no sistema nem sempre representa a prateleira.', pain: 5, danger: true },
    ],
  },
  {
    id: 's3',
    time: '14:25',
    title: 'Um cliente antigo pede para anotar R$ 86 no fiado.',
    story:
      'Você quer manter a relação com o cliente, mas também precisa saber quanto ele já deve e quando pagou da última vez. Onde essa informação está?',
    painKey: 'credit',
    choices: [
      { label: 'No próprio sistema', sub: 'Saldo e histórico por cliente.', pain: 0 },
      { label: 'Em planilha / WhatsApp', sub: 'Consigo achar, mas fica separado.', pain: 2 },
      { label: 'Caderno ou memória', sub: 'O controle depende da anotação estar certa.', pain: 5, danger: true },
    ],
  },
  {
    id: 's4',
    time: '18:10',
    title: 'No pico da tarde, o cliente pede a nota fiscal.',
    story:
      'Fila andando, funcionário novo no caixa, vários pagamentos acontecendo ao mesmo tempo. A emissão fiscal faz parte da venda ou vira outro processo?',
    painKey: 'fiscal',
    choices: [
      { label: 'Já sai pelo fluxo do PDV', sub: 'O operador resolve na própria venda.', pain: 0 },
      { label: 'Uso uma etapa / ferramenta separada', sub: 'Funciona, mas quebra o ritmo.', pain: 2 },
      { label: 'É uma dor recorrente', sub: 'Tenho retrabalho, dúvidas ou limitações.', pain: 5, danger: true },
    ],
  },
  {
    id: 's5',
    time: '21:08',
    title: 'Loja fechada. Agora vem a pergunta do dono: "quanto sobrou de verdade?"',
    story:
      'Você sabe quanto vendeu. Mas precisa entender caixa, contas, recebimentos, compras e o que está preso em estoque ou fiado. Você consegue responder sem abrir planilhas e extratos separados?',
    painKey: 'finance',
    choices: [
      { label: 'Sim. Tenho visão consolidada.', sub: 'Consigo acompanhar por painel.', pain: 0 },
      { label: 'Preciso juntar algumas informações', sub: 'O número existe, mas está espalhado.', pain: 3 },
      { label: 'É difícil saber com clareza', sub: 'Faturamento é fácil. Resultado, nem tanto.', pain: 6, danger: true },
    ],
  },
];

function buildProblemCards(pain) {
  const cards = [];
  if (pain.offline > 0) cards.push({ title: 'Venda sem internet', text: 'Seu caixa ainda tem algum nível de dependência da conexão.' });
  if (pain.stock > 0) cards.push({ title: 'Estoque que representa a prateleira', text: 'Quanto mais divergência, mais reposição e compra viram conferência manual.' });
  if (pain.credit > 0) cards.push({ title: 'Fiado rastreável', text: 'Recebíveis precisam ficar ligados ao cliente e ao caixa.' });
  if (pain.fiscal > 0) cards.push({ title: 'Fiscal dentro do fluxo', text: 'Trocar de ferramenta no meio do pico aumenta atrito operacional.' });
  if (pain.finance > 0) cards.push({ title: 'Visão financeira', text: 'O fechamento precisa gerar leitura do negócio, não mais uma tarefa.' });
  if (cards.length < 3) cards.push({ title: 'Centralização', text: 'Concentrar a operação reduz o número de pontos que o dono precisa conferir.' });
  return cards.slice(0, 3);
}

export default function FunilDiaDoMercado() {
  const [screen, setScreen] = useState('intro');
  const [pain, setPain] = useState({ offline: 0, stock: 0, credit: 0, fiscal: 0, finance: 0 });
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (screen === 'intro') return;
    trackFunnelEvent('marketfy_funnel_step_view', { funnelVariant: FUNNEL_VARIANT, step: screen });
  }, [screen]);

  const currentIndex = SCENARIOS.findIndex((s) => s.id === screen);
  const scenario = currentIndex >= 0 ? SCENARIOS[currentIndex] : null;
  const totalPain = useMemo(() => Object.values(pain).reduce((a, b) => a + b, 0), [pain]);
  const score = useMemo(() => Math.max(24, Math.min(94, 94 - totalPain * 3)), [totalPain]);

  const handleStart = () => {
    trackFunnelEvent('marketfy_funnel_start', { funnelVariant: FUNNEL_VARIANT });
    setScreen('s1');
  };

  const handleAnswer = (painKey, painValue) => {
    setPain((prev) => ({ ...prev, [painKey]: painValue }));
    const nextIndex = currentIndex + 1;
    setScreen(nextIndex < SCENARIOS.length ? SCENARIOS[nextIndex].id : 'final');
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setLeadError('Preencha nome e WhatsApp para ver o plano indicado.');
      return;
    }
    setLeadError('');
    try {
      await createFunnelLead({
        visitor_id: getFunnelVisitorId(),
        funnel_variant: FUNNEL_VARIANT,
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim() || null,
        control_score: score,
        answers: pain,
      });
    } catch {
      // segue mostrando a oferta mesmo se o lead falhar em persistir
    }
    trackFunnelEvent('marketfy_lead_submit', { funnelVariant: FUNNEL_VARIANT, control_score: score });
    setLeadSent(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {screen !== 'intro' && (
        <FunnelProgressBar
          current={currentIndex >= 0 ? currentIndex + 1 : SCENARIOS.length}
          total={SCENARIOS.length}
          label={scenario ? scenario.time : 'diagnóstico concluído'}
        />
      )}

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {screen === 'intro' && (
          <section className="py-10 text-center">
            <span className="inline-flex rounded-full bg-lime-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-green">
              Teste rápido · menos de 2 minutos
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-gray-950 sm:text-5xl">
              Seu mercado aguenta um dia ruim sem virar um caos?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-500">
              Vamos simular 5 situações comuns — internet instável, produto faltando, fiado, nota
              fiscal e fechamento. Você responde como sua operação lida com cada uma. No final,
              mostramos seu nível de controle.
            </p>
            <Button onClick={handleStart} className="mt-7 font-bold" size="lg">
              Simular meu dia →
            </Button>
            <p className="mt-3 text-xs text-gray-400">Não é prova. É um raio-x prático da operação.</p>
          </section>
        )}

        {scenario && (
          <section>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
              {scenario.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">{scenario.story}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {scenario.choices.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => handleAnswer(scenario.painKey, choice.pain)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    choice.danger ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-brand-yellow'
                  }`}
                >
                  <strong className="block text-sm text-gray-950">{choice.label}</strong>
                  <span className="mt-1.5 block text-xs leading-5 text-gray-500">{choice.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === 'final' && (
          <section className="py-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <FunnelScoreRing score={score} />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-brand-green">
                  Resultado do teste
                </span>
                <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-gray-950">
                  {totalPain >= 17
                    ? 'Seu mercado vende, mas o dono ainda precisa "segurar" a operação.'
                    : totalPain >= 8
                    ? 'Sua operação tem base, mas ainda há pontos que dependem de conferência.'
                    : 'Seu mercado já tem bons controles. A oportunidade é centralizar e ganhar visão.'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  O problema não é falta de esforço: é informação espalhada. Quando venda, estoque,
                  fiado, fiscal e financeiro não conversam, o dono vira a integração do sistema.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {buildProblemCards(pain).map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <strong className="text-sm text-gray-950">{card.title}</strong>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{card.text}</p>
                </div>
              ))}
            </div>

            {!leadSent ? (
              <form onSubmit={handleLeadSubmit} className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Cidade / UF" value={city} onChange={(e) => setCity(e.target.value)} />
                <Button type="submit" className="font-bold">
                  Ver plano indicado →
                </Button>
                {leadError && <p className="text-xs font-medium text-red-500 sm:col-span-4">{leadError}</p>}
              </form>
            ) : (
              <FunnelOfferPanel funnelVariant={FUNNEL_VARIANT} />
            )}
          </section>
        )}
      </main>

      <CookieConsentBanner />
    </div>
  );
}
```

- [ ] **Step 4: Registrar a rota em `App.jsx`**

Em `src/App.jsx`, adicionar o lazy import junto dos outros:

```jsx
const FunilDiaDoMercado = React.lazy(() => import('./pages/marketing/FunilDiaDoMercado'));
```

E a rota pública, perto de `/precos`:

```jsx
<Route path="/funil-b" element={<FunilDiaDoMercado />} />
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test -- funilDiaDoMercado`
Expected: PASS (3 testes)

- [ ] **Step 6: Verificar manualmente no navegador**

Run: `npm run dev` e abrir `http://localhost:3000/funil-b` — clicar em "Simular meu dia →", responder os 5 cenários, preencher nome/whatsapp e confirmar que a oferta aparece com o preço real do plano.

- [ ] **Step 7: Commit**

```bash
git add src/pages/marketing/FunilDiaDoMercado.jsx src/App.jsx src/test/funilDiaDoMercado.test.jsx
git commit -m "feat: add /funil-b (dia do mercado) page"
```

---

### Task 5: Funil A — "Diagnóstico" (`/funil-a`)

**Files:**
- Create: `src/pages/marketing/FunilDiagnostico.jsx`
- Modify: `src/App.jsx`
- Test: `src/test/funilDiagnostico.test.jsx`

**Interfaces:**
- Consumes: `FunnelProgressBar`, `FunnelScoreRing`, `FunnelOfferPanel` (Tasks 2-3), `trackFunnelEvent`/`getFunnelVisitorId` (Task 1), `createFunnelLead` (Task 1), `CookieConsentBanner`, `Input`/`Button`.
- Produces: rota pública `/funil-a`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/funilDiagnostico.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunilDiagnostico from '../pages/marketing/FunilDiagnostico';
import { createFunnelLead } from '../lib/marketingFunnelApi';
import { trackFunnelEvent, getFunnelVisitorId } from '../lib/funnelTracking';

vi.mock('../lib/marketingFunnelApi', () => ({
  createFunnelLead: vi.fn().mockResolvedValue({}),
}));
vi.mock('../lib/funnelTracking', () => ({
  trackFunnelEvent: vi.fn(),
  getFunnelVisitorId: vi.fn().mockReturnValue('visitor-a-1'),
}));
vi.mock('../components/marketing/FunnelOfferPanel', () => ({
  default: ({ funnelVariant }) => <div data-testid="offer-panel">oferta {funnelVariant}</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <FunilDiagnostico />
    </MemoryRouter>
  );

async function answerAllQuestions(user) {
  await user.click(screen.getByRole('button', { name: /começar meu diagnóstico/i }));
  // 10 perguntas de múltipla escolha — sempre a primeira opção (menor dor)
  for (let i = 0; i < 10; i += 1) {
    const options = screen.getAllByRole('button');
    await user.click(options[0]);
  }
}

describe('FunilDiagnostico (/funil-a)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts the funnel and tracks the first question', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /começar meu diagnóstico/i }));

    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_funnel_start', { funnelVariant: 'A' });
    expect(screen.getByText(/qual negócio você administra hoje/i)).toBeInTheDocument();
  });

  it('walks through all 10 questions and reaches the lead form', async () => {
    const user = userEvent.setup();
    renderPage();

    await answerAllQuestions(user);

    expect(screen.getByText(/para onde enviamos sua recomendação/i)).toBeInTheDocument();
  });

  it('requires name and (phone or email), then shows the analysis, result and offer', async () => {
    const user = userEvent.setup();
    renderPage();
    await answerAllQuestions(user);

    await user.click(screen.getByRole('button', { name: /analisar meu perfil/i }));
    expect(screen.getByText(/preencha seu nome e pelo menos whatsapp ou e-mail/i)).toBeInTheDocument();
    expect(createFunnelLead).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana');
    await user.type(screen.getByPlaceholderText('WhatsApp'), '11999990000');
    await user.click(screen.getByRole('button', { name: /analisar meu perfil/i }));

    expect(createFunnelLead).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_id: 'visitor-a-1', funnel_variant: 'A', name: 'Ana', phone: '11999990000' })
    );
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'marketfy_lead_submit',
      expect.objectContaining({ funnelVariant: 'A' })
    );

    const resultHeading = await screen.findByText(/você já tem uma boa base/i, {}, { timeout: 2000 });
    expect(resultHeading).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver minha recomendação/i }));
    expect(await screen.findByTestId('offer-panel')).toHaveTextContent('oferta A');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- funilDiagnostico`
Expected: FAIL — `Cannot find module '../pages/marketing/FunilDiagnostico'`.

- [ ] **Step 3: Implementar `FunilDiagnostico.jsx`**

Criar `src/pages/marketing/FunilDiagnostico.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react';
import FunnelProgressBar from '../../components/marketing/FunnelProgressBar';
import FunnelScoreRing from '../../components/marketing/FunnelScoreRing';
import FunnelOfferPanel from '../../components/marketing/FunnelOfferPanel';
import CookieConsentBanner from '../../components/CookieConsentBanner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { trackFunnelEvent, getFunnelVisitorId } from '../../lib/funnelTracking';
import { createFunnelLead } from '../../lib/marketingFunnelApi';

const FUNNEL_VARIANT = 'A';

const QUESTIONS = [
  {
    id: 'q1',
    index: 'Pergunta 1 de 11',
    title: 'Qual negócio você administra hoje?',
    lead: 'Isso ajuda a calibrar o diagnóstico para o tamanho e a rotina da operação.',
    key: 'business',
    options: [
      { label: 'Mercadinho de bairro', sub: 'Operação enxuta, geralmente com 1 ou 2 caixas.', value: 'Mercadinho de bairro', pain: 0 },
      { label: 'Mercado / supermercado', sub: 'Mais fluxo, mix maior e equipe no caixa.', value: 'Mercado / supermercado', pain: 0 },
      { label: 'Mercearia / conveniência', sub: 'Venda rápida e forte recorrência de clientes.', value: 'Mercearia / conveniência', pain: 0 },
      { label: 'Outro varejo alimentar', sub: 'Hortifruti, açougue, padaria ou operação semelhante.', value: 'Outro varejo alimentar', pain: 0 },
    ],
  },
  {
    id: 'q2',
    index: 'Pergunta 2 de 11',
    title: 'Quantos caixas vendem ao mesmo tempo nos horários de pico?',
    key: 'checkouts',
    options: [
      { label: '1 caixa', value: '1', pain: 0 },
      { label: '2 caixas', value: '2', pain: 0 },
      { label: '3 a 5 caixas', value: '3-5', pain: 0 },
      { label: '6 ou mais caixas', value: '6+', pain: 0 },
    ],
  },
  {
    id: 'q3',
    index: 'Pergunta 3 de 11',
    title: 'Quando a internet fica instável, o seu caixa continua vendendo normalmente?',
    lead: 'Fila parada é um problema diferente de "site lento": é venda interrompida no pior momento.',
    key: 'offline',
    options: [
      { label: 'Sim. O caixa continua.', sub: 'A operação já tem contingência.', value: 'Sim, continua', pain: 0 },
      { label: 'Às vezes / depende', sub: 'Já tivemos lentidão ou interrupção.', value: 'Às vezes', pain: 2 },
      { label: 'Não. Se cair, complica.', sub: 'O caixa depende da conexão.', value: 'Não', pain: 4 },
    ],
  },
  {
    id: 'q4',
    index: 'Pergunta 4 de 11',
    title: 'Seu estoque "bate" com a prateleira?',
    key: 'stock',
    options: [
      { label: 'Quase sempre', sub: 'Entrada e saída estão bem registradas.', value: 'Quase sempre', pain: 0 },
      { label: 'Tem algumas diferenças', sub: 'Às vezes falta no sistema ou sobra na tela.', value: 'Algumas diferenças', pain: 2 },
      { label: 'Eu não confio no estoque atual', sub: 'Compra e reposição ainda dependem muito de conferência manual.', value: 'Não confio no estoque', pain: 4 },
    ],
  },
  {
    id: 'q5',
    index: 'Pergunta 5 de 11',
    title: 'Como você controla vendas no fiado?',
    key: 'credit',
    options: [
      { label: 'Já fica no sistema', sub: 'Saldo e histórico por cliente.', value: 'Sistema integrado', pain: 0 },
      { label: 'Planilha, WhatsApp ou anotações separadas', sub: 'Funciona, mas exige conferência.', value: 'Planilha / WhatsApp', pain: 2 },
      { label: 'Caderno ou memória', sub: 'A cobrança depende de registro manual.', value: 'Caderno / memória', pain: 4 },
      { label: 'Não vendo fiado', value: 'Não vendo fiado', pain: 0 },
    ],
  },
  {
    id: 'q6',
    index: 'Pergunta 6 de 11',
    title: 'E a emissão fiscal hoje?',
    lead: 'A ideia é entender se nota e cupom fazem parte do fluxo ou viram uma tarefa paralela.',
    key: 'fiscal',
    options: [
      { label: 'Integrada ao PDV', sub: 'Emissão acontece na própria venda.', value: 'Integrada ao PDV', pain: 0 },
      { label: 'Uso outra ferramenta / processo separado', value: 'Ferramenta separada', pain: 2 },
      { label: 'Dá trabalho ou tenho dúvidas no processo', value: 'Dá trabalho / tenho dúvidas', pain: 4 },
    ],
  },
  {
    id: 'q7',
    index: 'Pergunta 7 de 11',
    title: 'No fim do mês, você sabe com clareza quanto o mercado realmente gerou?',
    key: 'finance',
    options: [
      { label: 'Sim, acompanho por painel', sub: 'Vendas, caixa e contas ficam organizados.', value: 'Sim, acompanho por painel', pain: 0 },
      { label: 'Preciso juntar várias informações', sub: 'Extrato, planilha, caixa e sistema.', value: 'Preciso juntar informações', pain: 3 },
      { label: 'Acabo indo mais pelo "feeling"', sub: 'Faturamento eu vejo. Resultado de verdade, nem sempre.', value: 'Mais no feeling', pain: 5 },
    ],
  },
  {
    id: 'q8',
    index: 'Pergunta 8 de 11',
    title: 'Qual dessas situações mais incomoda você hoje?',
    key: 'mainPain',
    options: [
      { label: 'Caixa lento, travando ou dependente da internet', value: 'Caixa lento / internet', pain: 4 },
      { label: 'Estoque errado e reposição no achismo', value: 'Estoque e reposição', pain: 4 },
      { label: 'Fiado e contas a receber difíceis de acompanhar', value: 'Fiado e recebimentos', pain: 4 },
      { label: 'Não ter visão financeira clara do negócio', value: 'Financeiro sem visão', pain: 4 },
      { label: 'Emissão fiscal e operação em ferramentas separadas', value: 'Fiscal / emissão', pain: 4 },
    ],
  },
  {
    id: 'q9',
    index: 'Pergunta 9 de 11',
    title: 'O que você usa hoje para tocar a operação?',
    key: 'current',
    options: [
      { label: 'Outro sistema de PDV/ERP', value: 'Outro sistema de PDV', pain: 1 },
      { label: 'Planilhas + ferramentas separadas', value: 'Planilhas + ferramentas', pain: 3 },
      { label: 'Muita coisa manual', value: 'Muito manual', pain: 4 },
      { label: 'Estou abrindo ou estruturando o mercado agora', value: 'Abrindo / implantando', pain: 2 },
    ],
  },
  {
    id: 'q10',
    index: 'Pergunta 10 de 11',
    title: 'Se encontrar uma solução que resolva esses pontos, quando gostaria de organizar isso?',
    key: 'urgency',
    options: [
      { label: 'Agora / nos próximos dias', value: 'Agora / próximos dias', pain: 2 },
      { label: 'Nas próximas semanas', value: 'Próximas semanas', pain: 1 },
      { label: 'Estou pesquisando primeiro', value: 'Só pesquisando', pain: 0 },
    ],
  },
];

const GAP_DEFINITIONS = [
  { key: 'offline', isGap: (v) => v !== 'Sim, continua', title: 'Continuidade de venda', text: 'Uma operação offline-first reduz a dependência do caixa em relação à conexão.' },
  { key: 'stock', isGap: (v) => v !== 'Quase sempre', title: 'Estoque', text: 'Venda e estoque precisam conversar para a reposição não depender de memória.' },
  { key: 'credit', isGap: (v) => Boolean(v) && v !== 'Sistema integrado' && v !== 'Não vendo fiado', title: 'Fiado', text: 'Saldo e histórico por cliente evitam que o recebível fique espalhado.' },
  { key: 'finance', isGap: (v) => v !== 'Sim, acompanho por painel', title: 'Financeiro', text: 'O dono precisa enxergar vendas e movimento financeiro sem montar o número manualmente.' },
  { key: 'fiscal', isGap: (v) => v !== 'Integrada ao PDV', title: 'Fiscal', text: 'Emitir dentro do fluxo reduz troca de ferramenta e retrabalho.' },
];

function buildGaps(answers) {
  const gaps = GAP_DEFINITIONS.filter((g) => g.isGap(answers[g.key])).map((g) => ({ title: g.title, text: g.text }));
  if (gaps.length < 2) {
    gaps.push({ title: 'Centralização', text: 'Seu ganho potencial está em colocar operação e gestão na mesma rotina.' });
  }
  return gaps.slice(0, 4);
}

export default function FunilDiagnostico() {
  const [screen, setScreen] = useState('intro'); // intro | q1..q10 | lead | analysis | result
  const [answers, setAnswers] = useState({});
  const [painScore, setPainScore] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [leadError, setLeadError] = useState('');
  const [offerRevealed, setOfferRevealed] = useState(false);

  useEffect(() => {
    if (screen === 'intro') return;
    trackFunnelEvent('marketfy_funnel_step_view', { funnelVariant: FUNNEL_VARIANT, step: screen });
  }, [screen]);

  useEffect(() => {
    if (screen !== 'analysis') return undefined;
    const timer = setTimeout(() => setScreen('result'), 1200);
    return () => clearTimeout(timer);
  }, [screen]);

  const controlScore = useMemo(() => Math.max(22, Math.min(88, 92 - painScore * 3)), [painScore]);
  const questionIndex = QUESTIONS.findIndex((q) => q.id === screen);
  const question = questionIndex >= 0 ? QUESTIONS[questionIndex] : null;

  const handleStart = () => {
    trackFunnelEvent('marketfy_funnel_start', { funnelVariant: FUNNEL_VARIANT });
    setScreen('q1');
  };

  const handleAnswer = (key, value, pain) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setPainScore((prev) => prev + pain);
    const nextIndex = questionIndex + 1;
    setScreen(nextIndex < QUESTIONS.length ? QUESTIONS[nextIndex].id : 'lead');
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      setLeadError('Preencha seu nome e pelo menos WhatsApp ou e-mail para continuar.');
      return;
    }
    setLeadError('');
    try {
      await createFunnelLead({
        visitor_id: getFunnelVisitorId(),
        funnel_variant: FUNNEL_VARIANT,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        control_score: controlScore,
        answers,
      });
    } catch {
      // segue mostrando o resultado mesmo se o lead falhar em persistir
    }
    trackFunnelEvent('marketfy_lead_submit', { funnelVariant: FUNNEL_VARIANT, control_score: controlScore });
    setScreen('analysis');
  };

  const riskLabel = painScore >= 18 ? 'controle vulnerável' : painScore >= 10 ? 'há pontos de atenção' : 'boa base operacional';
  const resultTitle =
    painScore >= 18
      ? 'Hoje, parte importante do seu mercado ainda depende de improviso e conferência manual.'
      : painScore >= 10
      ? 'Seu mercado já tem estrutura, mas existem gargalos que podem crescer junto com a operação.'
      : 'Você já tem uma boa base. O ganho está em centralizar e enxergar melhor a operação.';

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {screen !== 'intro' && (
        <FunnelProgressBar
          current={questionIndex >= 0 ? questionIndex + 1 : QUESTIONS.length}
          total={QUESTIONS.length}
          label={
            screen === 'lead'
              ? 'última etapa'
              : screen === 'analysis' || screen === 'result'
              ? 'diagnóstico concluído'
              : `pergunta ${questionIndex + 1} de ${QUESTIONS.length}`
          }
        />
      )}

      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        {screen === 'intro' && (
          <section className="text-center">
            <span className="inline-flex rounded-full bg-lime-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-green">
              Diagnóstico gratuito · 2 a 4 minutos
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight text-gray-950 sm:text-5xl">
              Seu mercado está sob controle — ou você só descobre os problemas no fim do dia?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-500">
              Responda algumas perguntas sobre caixa, estoque, fiado, fiscal e financeiro. No
              final, o Marketfy monta um diagnóstico do seu nível de controle e recomenda a
              configuração mais adequada para sua operação.
            </p>
            <Button onClick={handleStart} className="mt-7 font-bold" size="lg">
              Começar meu diagnóstico →
            </Button>
            <p className="mt-3 text-xs text-gray-400">Sem formulário gigante. Uma pergunta por vez.</p>
          </section>
        )}

        {question && (
          <section>
            <span className="text-xs font-black uppercase tracking-wider text-brand-green">{question.index}</span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
              {question.title}
            </h2>
            {question.lead && <p className="mt-3 text-sm leading-6 text-gray-500">{question.lead}</p>}
            <div className="mt-6 grid gap-2.5">
              {question.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleAnswer(question.key, option.value, option.pain)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-yellow hover:shadow-md"
                >
                  <span>
                    <strong className="block text-sm text-gray-950">{option.label}</strong>
                    {option.sub && <span className="mt-1 block text-xs leading-5 text-gray-500">{option.sub}</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === 'lead' && (
          <section>
            <span className="text-xs font-black uppercase tracking-wider text-brand-green">Última etapa</span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
              Para onde enviamos sua recomendação?
            </h2>
            <form onSubmit={handleLeadSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="sm:col-span-2">
                <Input placeholder="Cidade / UF" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <Button type="submit" className="font-bold sm:col-span-2" size="lg">
                Analisar meu perfil →
              </Button>
              {leadError && <p className="text-xs font-medium text-red-500 sm:col-span-2">{leadError}</p>}
            </form>
          </section>
        )}

        {screen === 'analysis' && (
          <section className="py-16 text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-100 border-t-brand-green" />
            <h2 className="mt-6 text-2xl font-black text-gray-950">Estamos cruzando suas respostas...</h2>
          </section>
        )}

        {screen === 'result' && (
          <section>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <FunnelScoreRing score={controlScore} />
              <div>
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-600">
                  {riskLabel}
                </span>
                <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-gray-950 sm:text-3xl">
                  {resultTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Pelas suas respostas, a oportunidade não está apenas em trocar o sistema do
                  caixa. Está em conectar a venda ao estoque, fiscal, fiado e financeiro para
                  reduzir decisões no escuro.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {buildGaps(answers).map((gap) => (
                <div key={gap.title} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <strong className="text-sm text-gray-950">{gap.title}</strong>
                  <p className="mt-1.5 text-xs leading-5 text-gray-500">{gap.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-lime-200 bg-lime-50 p-4 text-sm leading-6 text-emerald-900">
              <strong>Leitura do perfil:</strong> o Marketfy Pro faz mais sentido quando o objetivo
              é centralizar operação e gestão, não apenas registrar vendas.
            </div>

            {!offerRevealed ? (
              <Button onClick={() => setOfferRevealed(true)} className="mt-6 font-bold" size="lg">
                Ver minha recomendação →
              </Button>
            ) : (
              <FunnelOfferPanel funnelVariant={FUNNEL_VARIANT} />
            )}
          </section>
        )}
      </main>

      <CookieConsentBanner />
    </div>
  );
}
```

- [ ] **Step 4: Registrar a rota em `App.jsx`**

Em `src/App.jsx`, adicionar:

```jsx
const FunilDiagnostico = React.lazy(() => import('./pages/marketing/FunilDiagnostico'));
```

E a rota:

```jsx
<Route path="/funil-a" element={<FunilDiagnostico />} />
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test -- funilDiagnostico`
Expected: PASS (3 testes)

- [ ] **Step 6: Verificar manualmente no navegador**

Run: `npm run dev` e abrir `http://localhost:3000/funil-a` — responder as 11 etapas, confirmar o resultado e a oferta com preço real.

- [ ] **Step 7: Commit**

```bash
git add src/pages/marketing/FunilDiagnostico.jsx src/App.jsx src/test/funilDiagnostico.test.jsx
git commit -m "feat: add /funil-a (diagnostico) page"
```

---

### Task 6: Painel admin — Funis A/B (`/admin/funis`)

**Files:**
- Create: `src/pages/admin/MarketingFunnels.jsx`
- Modify: `src/components/layout/SaaSLayout.jsx`
- Modify: `src/App.jsx`
- Test: `src/test/marketingFunnelsAdmin.test.jsx`

**Interfaces:**
- Consumes: `getMarketingFunnelSummary`, `getMarketingFunnelLeads` (Task 1), `formatDate` (`src/lib/utils.js`, já existe).
- Produces: rota admin `/admin/funis`, item de menu "Funis A/B" no `SaaSLayout`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/test/marketingFunnelsAdmin.test.jsx`:

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarketingFunnels from '../pages/admin/MarketingFunnels';
import { getMarketingFunnelLeads, getMarketingFunnelSummary } from '../lib/marketingFunnelApi';

vi.mock('../lib/marketingFunnelApi', () => ({
  getMarketingFunnelSummary: vi.fn(),
  getMarketingFunnelLeads: vi.fn(),
}));

const summary = [
  {
    funnel_variant: 'A',
    steps: [
      { label: 'Início', count: 100, conversion_pct: 100, drop_off_pct: 0 },
      { label: 'Lead enviado', count: 20, conversion_pct: 20, drop_off_pct: 80 },
      { label: 'CTA clicado', count: 10, conversion_pct: 10, drop_off_pct: 50 },
    ],
    lead_count: 20,
    cta_click_count: 10,
    lead_to_cta_rate: 50,
  },
  {
    funnel_variant: 'B',
    steps: [
      { label: 'Início', count: 80, conversion_pct: 100, drop_off_pct: 0 },
      { label: 'Lead enviado', count: 30, conversion_pct: 37.5, drop_off_pct: 62.5 },
      { label: 'CTA clicado', count: 12, conversion_pct: 15, drop_off_pct: 60 },
    ],
    lead_count: 30,
    cta_click_count: 12,
    lead_to_cta_rate: 40,
  },
];

const leads = [
  { id: 'l1', funnel_variant: 'A', name: 'Ana', phone: '11999990000', email: null, control_score: 40, created_at: '2026-09-15T10:00:00Z' },
];

describe('MarketingFunnels (/admin/funis)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMarketingFunnelSummary.mockResolvedValue({ data: summary });
    getMarketingFunnelLeads.mockResolvedValue({ data: leads });
  });

  it('shows lead counts and CTA rate for both funnels', async () => {
    render(<MarketingFunnels />);

    expect(await screen.findByRole('heading', { name: /funil a/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /funil b/i })).toBeInTheDocument();
    expect(screen.getByText(/20 leads/i)).toBeInTheDocument();
    expect(screen.getByText(/30 leads/i)).toBeInTheDocument();
    expect(screen.getByText(/50% dos leads clicaram no cta/i)).toBeInTheDocument();
  });

  it('lists captured leads', async () => {
    render(<MarketingFunnels />);

    const row = (await screen.findByText('Ana')).closest('tr');
    expect(within(row).getByText('11999990000')).toBeInTheDocument();
  });

  it('refetches leads filtered by variant when the select changes', async () => {
    const user = userEvent.setup();
    render(<MarketingFunnels />);
    await screen.findByText('Ana');

    await user.selectOptions(screen.getByRole('combobox'), 'B');

    expect(getMarketingFunnelLeads).toHaveBeenCalledWith('B');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- marketingFunnelsAdmin`
Expected: FAIL — `Cannot find module '../pages/admin/MarketingFunnels'`.

- [ ] **Step 3: Implementar `MarketingFunnels.jsx`**

Criar `src/pages/admin/MarketingFunnels.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { Loader2, TrendingUp, Users } from 'lucide-react';
import { getMarketingFunnelLeads, getMarketingFunnelSummary } from '../../lib/marketingFunnelApi';
import { formatDate } from '../../lib/utils';

const FUNNEL_LABELS = { A: 'Funil A — Diagnóstico', B: 'Funil B — Dia do mercado' };

export default function MarketingFunnels() {
  const [summary, setSummary] = useState([]);
  const [leads, setLeads] = useState([]);
  const [variantFilter, setVariantFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [summaryRes, leadsRes] = await Promise.all([
          getMarketingFunnelSummary(),
          getMarketingFunnelLeads(variantFilter || undefined),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setLeads(leadsRes.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [variantFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-yellow" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-black text-gray-950">Funis A/B</h1>
      <p className="mt-1 text-sm text-gray-500">Conversão por etapa e leads capturados em /funil-a e /funil-b.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {summary.map((funnel) => (
          <div key={funnel.funnel_variant} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-950">
                {FUNNEL_LABELS[funnel.funnel_variant] || funnel.funnel_variant}
              </h2>
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Users size={14} /> {funnel.lead_count} leads
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-brand-green">
              <TrendingUp size={14} /> {funnel.lead_to_cta_rate}% dos leads clicaram no CTA
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel.steps} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value, _name, props) => [
                      `${value} visitantes (${props.payload.drop_off_pct}% de queda)`,
                      props.payload.label,
                    ]}
                  />
                  <Bar dataKey="count" fill="#FACC15" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-950">Leads capturados</h2>
          <select
            value={variantFilter}
            onChange={(e) => setVariantFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos os funis</option>
            <option value="A">Funil A</option>
            <option value="B">Funil B</option>
          </select>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Funil</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Nenhum lead capturado ainda.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone || lead.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {FUNNEL_LABELS[lead.funnel_variant] || lead.funnel_variant}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.control_score ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(lead.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Adicionar o item de menu em `SaaSLayout.jsx`**

Em `src/components/layout/SaaSLayout.jsx`, trocar o import de ícones:

```jsx
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  LogOut,
  ShieldAlert
} from 'lucide-react';
```

por:

```jsx
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  LogOut,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
```

E adicionar a entrada no array `menuItems`:

```jsx
const menuItems = [
  { icon: LayoutDashboard, label: 'Visão Geral', path: '/admin' },
  { icon: Package, label: 'Gestão de Planos', path: '/admin/plans' },
  { icon: TrendingUp, label: 'Funis A/B', path: '/admin/funis' },
  { icon: MessageSquare, label: 'Chamados / Suporte', path: '/admin/tickets' },
];
```

- [ ] **Step 5: Registrar a rota em `App.jsx`**

Adicionar o lazy import:

```jsx
const MarketingFunnels = React.lazy(() => import('./pages/admin/MarketingFunnels'));
```

E, dentro do bloco `<Route path="/admin" element={<AdminRoute><SaaSLayout /></AdminRoute>}>`, junto das outras rotas filhas:

```jsx
<Route path="funis" element={<MarketingFunnels />} />
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npm run test -- marketingFunnelsAdmin`
Expected: PASS (3 testes)

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/MarketingFunnels.jsx src/components/layout/SaaSLayout.jsx src/App.jsx src/test/marketingFunnelsAdmin.test.jsx
git commit -m "feat: add /admin/funis panel with step conversion and captured leads"
```

---

### Task 7: Suíte completa

- [ ] **Step 1: Rodar toda a suíte de testes do frontend**

Run: `npm run test`
Expected: PASS (nenhuma regressão nos testes existentes, todos os testes novos das Tasks 1-6 passando).

- [ ] **Step 2: Rodar o lint**

Run: `npm run lint`
Expected: sem erros novos nos arquivos criados/modificados nesta feature.

- [ ] **Step 3: Build de produção**

Run: `npm run build`
Expected: build conclui sem erro (garante que os lazy imports novos resolvem corretamente).

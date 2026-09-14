# D9 — Analytics de produto com PostHog (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumentar o funil de navegação (landing → cadastro → trial → checkout) com PostHog, com um banner de consentimento simples nas páginas públicas e `identify()` só depois do login confirmado.

**Architecture:** Um wrapper fino (`lib/analytics.js`) em volta de `posthog-js`, que nunca é importado diretamente nas páginas (mesmo padrão de `lib/api.js` em volta de `axios`). Antes do consentimento, `track()`/`identifyUser()` são no-op silencioso. `CookieConsentBanner` guarda a escolha em `localStorage` e chama `initAnalytics()` só no aceite; `App.jsx` recarrega essa escolha a cada load.

**Tech Stack:** React 18, `posthog-js` (novo), Vitest + Testing Library. `posthog-js` é mockado em todos os testes — nenhum teste faz rede real ou carrega o SDK de verdade.

**Spec:** `backend/docs/superpowers/specs/2026-09-14-product-analytics-posthog-design.md` (repo principal — a seção 6 é a relevante aqui). Companion: `backend/docs/superpowers/plans/2026-09-14-d9-analytics-posthog-backend.md`.

## Global Constraints

- `initAnalytics()` só roda depois do consentimento explícito — nunca no load da página sem interação do usuário (exceto recarregar uma escolha *já dada* anteriormente, salva em `localStorage`).
- `identify()` só roda **depois do login bem-sucedido** (ou refresh de sessão bem-sucedido) — nunca antes, para não linkar um `distinct_id` anônimo a PII sem conta confirmada.
- Recusar o banner não bloqueia o uso do site, só não gera eventos.
- Nenhum teste depende de rede real ou do SDK real do PostHog — sempre `vi.mock('posthog-js', ...)` ou `vi.mock('../lib/analytics', ...)`.
- Commits terminam com `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Evidência levantada relendo o código em 2026-09-14

| Achado | Evidência |
|---|---|
| `posthog-js` ainda não é dependência | `package.json` não lista `posthog-js`; precisa `npm install posthog-js` na Task 1. |
| **Achado extra (não estava no spec):** `PlanCard.jsx` desabilita `onClick` sempre que `ctaTo` está definido | `src/components/billing/PlanCard.jsx` (bloco do `Button`): `onClick={ctaTo ? undefined : onCtaClick}`. `Home.jsx` e `Pricing.jsx` usam **`ctaTo`** (não `onCtaClick`) pros cards de plano — então hoje é **impossível** disparar `plan_cta_clicked` nesses dois lugares sem primeiro corrigir essa linha; só `Plans.jsx` usa `onCtaClick` (sem `ctaTo`, porque abre um modal em vez de navegar). Correção: `onClick={onCtaClick}` sempre — `Link` aceita `onClick` normalmente junto com `to` (o clique dispara antes da navegação, não a impede). |
| `AuthContext.refreshUser()` é o ponto único certo pra `identify()` | `src/context/AuthContext.jsx:24-29` — chamado tanto no load inicial (depois de `/auth/refresh`) quanto em `login()` (linha 58). Colocar `identifyUser()` dentro de `refreshUser()`, logo depois de `setUser(data)`, cobre os dois casos do spec §6.4 ("login e refresh de sessão") sem duplicar a chamada em dois lugares. |
| Páginas públicas confirmadas | `App.jsx`: `/` → `AppRedirect` → `<Home />` quando não há usuário; `/precos` → `Pricing`; `/termos` → `Terms`; `/privacidade` → `Privacy`. `Terms.jsx` e `Privacy.jsx` compartilham `components/legal/LegalPageLayout.jsx` (ambos só passam `title`/`children`) — colocar o banner ali cobre as duas páginas com uma única edição, em vez de duplicar em `Terms.jsx` e `Privacy.jsx` separadamente. |
| `Home.jsx` e `Pricing.jsx` não compartilham layout — banner entra em cada um | Confirmado, arquivos totalmente independentes (cada um com seu próprio `<header>`). |
| Nenhum teste hoje cobre `PlanCard.jsx` isoladamente | Sem `PlanCard.test.jsx` — os testes de clique em CTA de plano vivem dentro de `home.test.jsx`/`plans.test.jsx`, então os testes novos de `plan_cta_clicked` entram nesses arquivos, não num arquivo novo. |
| `Plans.jsx` já tem toda a lógica de `handleSelectPlan`/`handleContract`/`handleActivateTrial` mapeada linha a linha | Ver plano — nenhuma surpresa em relação ao spec, os nomes de função e os dois branches de sucesso (`invoice`/`recurring`) batem exatamente com o spec §6.3. |

## Ordem de execução e deploy

1. Task 1 primeiro (dependência de todo o resto). Tasks 2-6 em sequência (Task 2 antes de 4/5/6 porque `App.jsx` e o banner precisam existir antes de qualquer página confiar em `initAnalytics` já ter rodado quando aplicável — na prática as tasks são independentes o bastante pra rodar fora de ordem, mas a ordem deste plano evita reverter o `PlanCard.jsx` duas vezes).
2. Rodar `npx vitest run` completo ao final de cada task.
3. Auto-deploy Vercel no push pra `main`. Sem `VITE_POSTHOG_KEY` configurada em produção, `initAnalytics()` roda mas o SDK real do PostHog recusa (`api_key` vazia) — checar com o time se a chave já existe antes do deploy, ou aceitar que o deploy sobe com analytics tecnicamente ligado mas sem destino (mesmo espírito do backend, onde `ANALYTICS_ENABLED=False` por padrão é seguro sem configurar nada).

---

### Task 1: `lib/analytics.js` — wrapper de `posthog-js`

**Files:**
- Install: `posthog-js` (`npm install posthog-js`)
- Create: `src/lib/analytics.js`
- Modify: `.env.example`
- Test: `src/test/analytics.test.js` (novo)

**Interfaces:**
- Produces: `initAnalytics(): void`, `track(event: string, properties?: object): void`, `identifyUser(user: {id, email, plan_name}): void` — consumidos por todas as tasks seguintes.

- [ ] **Step 0: Instalar a dependência**

Run: `npm install posthog-js`
Expected: `posthog-js` aparece em `package.json` (`dependencies`) e `package-lock.json` é atualizado.

- [ ] **Step 1: Escrever os testes que falham**

```javascript
// src/test/analytics.test.js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = { init: vi.fn(), capture: vi.fn(), identify: vi.fn() };
vi.mock('posthog-js', () => ({ default: posthogMock }));

describe('lib/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('does nothing before initAnalytics is called', async () => {
    const { track, identifyUser } = await import('../lib/analytics');
    track('landing_viewed');
    identifyUser({ id: 'u1' });
    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
  });

  it('initializes posthog-js with the configured key and host', async () => {
    const { initAnalytics } = await import('../lib/analytics');
    initAnalytics();
    expect(posthogMock.init).toHaveBeenCalledWith(
      'phc_test123',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' })
    );
  });

  it('does not initialize when there is no configured key', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const { initAnalytics } = await import('../lib/analytics');
    initAnalytics();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });

  it('does not initialize twice', async () => {
    const { initAnalytics } = await import('../lib/analytics');
    initAnalytics();
    initAnalytics();
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
  });

  it('tracks events once initialized', async () => {
    const { initAnalytics, track } = await import('../lib/analytics');
    initAnalytics();
    track('landing_viewed', { foo: 'bar' });
    expect(posthogMock.capture).toHaveBeenCalledWith('landing_viewed', { foo: 'bar' });
  });

  it('identifies the user once initialized', async () => {
    const { initAnalytics, identifyUser } = await import('../lib/analytics');
    initAnalytics();
    identifyUser({ id: 'u1', email: 'ana@t.com', plan_name: 'PRO' });
    expect(posthogMock.identify).toHaveBeenCalledWith('u1', { email: 'ana@t.com', plan_name: 'PRO' });
  });

  it('identifyUser is a no-op without a user', async () => {
    const { initAnalytics, identifyUser } = await import('../lib/analytics');
    initAnalytics();
    identifyUser(null);
    expect(posthogMock.identify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/analytics.test.js`
Expected: FAIL — `src/lib/analytics.js` não existe.

- [ ] **Step 3: Implementar `lib/analytics.js`**

```javascript
import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  if (!apiKey) return;
  posthog.init(apiKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  });
  initialized = true;
}

export function track(event, properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identifyUser(user) {
  if (!initialized || !user) return;
  posthog.identify(String(user.id), { email: user.email, plan_name: user.plan_name });
}
```

- [ ] **Step 4: Adicionar variáveis ao `.env.example`**

Adicionar ao final de `.env.example`:
```
# PostHog (analytics de produto) — vazio desliga o rastreamento no navegador
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run src/test/analytics.test.js`
Expected: PASS (7 testes)

- [ ] **Step 6: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/analytics.js .env.example src/test/analytics.test.js
git commit -m "feat(analytics): add lib/analytics.js wrapper around posthog-js (D9)"
```

---

### Task 2: `CookieConsentBanner` + `App.jsx` + páginas públicas

**Files:**
- Create: `src/components/CookieConsentBanner.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/Home.jsx`, `src/pages/Pricing.jsx`, `src/components/legal/LegalPageLayout.jsx` (cobre `Terms.jsx` e `Privacy.jsx`)
- Test: `src/test/cookieConsentBanner.test.jsx` (novo), `src/test/appAnalyticsBootstrap.test.jsx` (novo)

**Interfaces:**
- Consumes: `initAnalytics` (Task 1).

- [ ] **Step 1: Escrever os testes que falham**

```jsx
// src/test/cookieConsentBanner.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { initAnalytics } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ initAnalytics: vi.fn() }));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the banner when there is no stored choice yet', () => {
    render(<CookieConsentBanner />);
    expect(screen.getByRole('region', { name: /cookies/i })).toBeInTheDocument();
  });

  it('does not render once a choice was already stored', () => {
    localStorage.setItem('marketfy_cookie_consent', 'accepted');
    render(<CookieConsentBanner />);
    expect(screen.queryByRole('region', { name: /cookies/i })).not.toBeInTheDocument();
  });

  it('accepting stores the choice and initializes analytics', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole('button', { name: /aceitar/i }));
    expect(localStorage.getItem('marketfy_cookie_consent')).toBe('accepted');
    expect(initAnalytics).toHaveBeenCalledTimes(1);
  });

  it('declining stores the choice without initializing analytics', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole('button', { name: /recusar/i }));
    expect(localStorage.getItem('marketfy_cookie_consent')).toBe('declined');
    expect(initAnalytics).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: /cookies/i })).not.toBeInTheDocument();
  });
});
```

```jsx
// src/test/appAnalyticsBootstrap.test.jsx
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { initAnalytics } from '../lib/analytics';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(() => Promise.reject({ response: { status: 401 } })), post: vi.fn(() => Promise.reject()) },
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}));
vi.mock('../lib/analytics', () => ({ initAnalytics: vi.fn(), track: vi.fn(), identifyUser: vi.fn() }));

describe('App — bootstrap do consentimento de cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes analytics on load when consent was already accepted', () => {
    localStorage.setItem('marketfy_cookie_consent', 'accepted');
    render(<App />);
    expect(initAnalytics).toHaveBeenCalled();
  });

  it('does not initialize analytics when consent was declined', () => {
    localStorage.setItem('marketfy_cookie_consent', 'declined');
    render(<App />);
    expect(initAnalytics).not.toHaveBeenCalled();
  });

  it('does not initialize analytics without any stored choice', () => {
    render(<App />);
    expect(initAnalytics).not.toHaveBeenCalled();
  });
});
```

Antes de rodar, ler `src/lib/api.js` exports nomeados usados por `AuthContext.jsx` (`setAccessToken`, `clearAccessToken`, `getAccessToken`, todos já confirmados) — se `AuthContext.jsx` ou algum módulo carregado por `App.jsx` na rota `/` usar outro export nomeado de `lib/api.js` além desses três, adicionar ao mock acima antes de rodar (senão o teste quebra por `undefined is not a function`, não pela lógica do banner).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/cookieConsentBanner.test.jsx src/test/appAnalyticsBootstrap.test.jsx`
Expected: FAIL — `CookieConsentBanner` não existe; `App.jsx` não lê `localStorage` nem chama `initAnalytics`.

- [ ] **Step 3: Criar `CookieConsentBanner.jsx`**

```jsx
// src/components/CookieConsentBanner.jsx
import { useEffect, useState } from 'react';
import { initAnalytics } from '../lib/analytics';

const CONSENT_KEY = 'marketfy_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch {
      stored = null;
    }
    setVisible(!stored);
  }, []);

  const store = (value) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // localStorage indisponível (modo privado etc.) — segue sem persistir a escolha
    }
  };

  const handleAccept = () => {
    store('accepted');
    initAnalytics();
    setVisible(false);
  };

  const handleDecline = () => {
    store('declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 border-t border-gray-200 bg-white px-5 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:flex-row sm:justify-between sm:px-8"
    >
      <p className="text-sm text-gray-600">
        Usamos cookies para entender como você usa o Marketfy e melhorar o produto. Você pode recusar sem perder acesso ao site.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleDecline}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Editar `App.jsx`**

Adicionar imports no topo:
```javascript
import { useEffect } from 'react';
import { initAnalytics } from './lib/analytics';
```

Dentro de `function App() {`, antes do `return`:
```javascript
  useEffect(() => {
    try {
      if (localStorage.getItem('marketfy_cookie_consent') === 'accepted') {
        initAnalytics();
      }
    } catch {
      // localStorage indisponível — segue sem analytics
    }
  }, []);
```

- [ ] **Step 5: Montar o banner nas páginas públicas**

`src/pages/Home.jsx` — importar e renderizar `<CookieConsentBanner />` dentro do elemento raiz retornado pelo componente (ler o JSX de retorno de `Home.jsx` primeiro pra escolher o ponto certo — tipicamente logo depois da abertura da `<div>` raiz, como último elemento antes do fechamento, pra ficar fixo por cima de tudo via `fixed`).

`src/pages/Pricing.jsx` — mesma coisa.

`src/components/legal/LegalPageLayout.jsx` — mesma coisa (cobre `Terms.jsx` e `Privacy.jsx` automaticamente, já que os dois só passam `children` pra esse layout).

Import em cada um dos 3 arquivos:
```javascript
import CookieConsentBanner from '../components/CookieConsentBanner'; // ajustar o caminho relativo conforme a profundidade de cada arquivo
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run src/test/cookieConsentBanner.test.jsx src/test/appAnalyticsBootstrap.test.jsx`
Expected: PASS (7 testes)

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS — atenção especial a `src/test/home.test.jsx` e `src/test/pricing.page.test.jsx`, que agora renderizam um elemento a mais (`fixed` no rodapé) e podem precisar de `localStorage.clear()` num `beforeEach` se ainda não tiverem, pra não vazar o consentimento de um teste pro outro.

- [ ] **Step 8: Commit**

```bash
git add src/components/CookieConsentBanner.jsx src/App.jsx src/pages/Home.jsx src/pages/Pricing.jsx src/components/legal/LegalPageLayout.jsx src/test/cookieConsentBanner.test.jsx src/test/appAnalyticsBootstrap.test.jsx
git commit -m "feat(analytics): add cookie consent banner on public pages (D9)"
```

---

### Task 3: `AuthContext.jsx` — `identify()` após login/refresh

**Files:**
- Modify: `src/context/AuthContext.jsx`
- Test: `src/test/authContextIdentify.test.jsx` (novo — não existe teste dedicado a `AuthContext.jsx` hoje; se existir um ao ler o diretório antes de criar, estender esse em vez de criar um novo)

**Interfaces:**
- Consumes: `identifyUser` (Task 1).

- [ ] **Step 1: Escrever o teste que falha**

Ler `src/context/AuthContext.jsx` por completo antes de escrever o teste (já lido neste plano — `refreshUser` chama `api.get('/auth/me')`, `setUser(data)`, depois `refreshSubscription()`).

```jsx
// src/test/authContextIdentify.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { identifyUser } from '../lib/analytics';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}));
vi.mock('../lib/analytics', () => ({ identifyUser: vi.fn(), track: vi.fn(), initAnalytics: vi.fn() }));
vi.mock('../lib/db', () => ({ db: { sales_queue: { clear: vi.fn() } } }));

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <span>carregando</span>;
  return <span>{user ? `logado: ${user.name}` : 'sem sessão'}</span>;
}

describe('AuthContext — identify no PostHog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('identifies the user after a successful session refresh on load', async () => {
    api.post.mockResolvedValue({ data: { access_token: 'tok' } });
    api.get.mockResolvedValue({ data: { id: 'u1', name: 'Ana', email: 'ana@t.com', plan_name: 'PRO' } });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText(/logado: ana/i)).toBeInTheDocument());
    expect(identifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', email: 'ana@t.com', plan_name: 'PRO' })
    );
  });

  it('does not identify when there is no valid session', async () => {
    api.post.mockRejectedValue(new Error('no session'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText(/sem sessão/i)).toBeInTheDocument());
    expect(identifyUser).not.toHaveBeenCalled();
  });
});
```

Conferir o export exato de `lib/db.js` (`db`, com o método usado em `logout()`) antes de rodar — se o mock acima não bater com a forma real do módulo, ajustar (`AuthContext.jsx` só usa `db.sales_queue.clear()` dentro de `logout()`, que não é exercitado por este teste, mas o import do módulo real sem mock pode falhar por causa de dependências do IndexedDB no ambiente jsdom).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/authContextIdentify.test.jsx`
Expected: FAIL — `identifyUser` nunca é chamado.

- [ ] **Step 3: Editar `AuthContext.jsx`**

Import no topo:
```javascript
import { identifyUser } from '../lib/analytics';
```

`refreshUser` (linhas 24-29) — trocar:
```javascript
  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    refreshSubscription().catch(() => {});
    return data;
  }, [refreshSubscription]);
```
por:
```javascript
  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    identifyUser(data);
    refreshSubscription().catch(() => {});
    return data;
  }, [refreshSubscription]);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/authContextIdentify.test.jsx`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/context/AuthContext.jsx src/test/authContextIdentify.test.jsx
git commit -m "feat(analytics): identify the user in PostHog after login or session refresh (D9)"
```

---

### Task 4: `PlanCard.jsx` (fix) + `Home.jsx` + `Pricing.jsx` — `landing_viewed` e `plan_cta_clicked`

**Files:**
- Modify: `src/components/billing/PlanCard.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Pricing.jsx`
- Modify: `src/test/home.test.jsx`, `src/test/pricing.page.test.jsx` (estender)

**Interfaces:**
- Consumes: `track` (Task 1).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `src/test/home.test.jsx`, no topo do arquivo (junto dos outros `vi.mock`):
```javascript
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
```
E dentro do `describe('Home (landing)', ...)`, dois testes novos:
```javascript
  it('tracks landing_viewed on mount', async () => {
    const { track } = await import('../lib/analytics');
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(track).toHaveBeenCalledWith('landing_viewed');
  });

  it('tracks plan_cta_clicked when a plan CTA is clicked', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    render(<MemoryRouter><Home /></MemoryRouter>);

    const cta = await screen.findAllByRole('link', { name: /testar grátis/i });
    await user.click(cta[0]);

    expect(track).toHaveBeenCalledWith('plan_cta_clicked', expect.objectContaining({ plan_id: 'plan-essential' }));
  });
```

Conferir se `userEvent` e `screen` já estão importados em `home.test.jsx` (o arquivo hoje usa `render, screen` — `userEvent` pode não estar importado ainda; adicionar `import userEvent from '@testing-library/user-event';` no topo se faltar).

Mesma coisa em `src/test/pricing.page.test.jsx` (ler o arquivo primeiro pra achar o `describe` e os mocks já existentes, e replicar o padrão acima adaptado — `vi.mock('../lib/analytics', ...)`, teste de `plan_cta_clicked` no clique do CTA de um `PlanCard`; `Pricing.jsx` não precisa de `landing_viewed`, esse evento é só de `Home.jsx` por spec).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/home.test.jsx src/test/pricing.page.test.jsx`
Expected: FAIL — `track` nunca é chamado; além disso, mesmo depois de adicionar o `onCtaClick` em `Home.jsx`/`Pricing.jsx` (próximo step), o clique não dispararia nada enquanto `PlanCard.jsx` continuar com `onClick={ctaTo ? undefined : onCtaClick}`.

- [ ] **Step 3: Corrigir `PlanCard.jsx`**

No bloco do `Button` (perto do fim do arquivo) — trocar:
```jsx
        <Button
          as={ctaTo ? Link : 'button'}
          to={ctaTo}
          type={ctaTo ? undefined : 'button'}
          onClick={ctaTo ? undefined : onCtaClick}
```
por:
```jsx
        <Button
          as={ctaTo ? Link : 'button'}
          to={ctaTo}
          type={ctaTo ? undefined : 'button'}
          onClick={onCtaClick}
```

- [ ] **Step 4: Editar `Home.jsx`**

Import (linha 1) — trocar:
```javascript
import { useId, useState } from 'react';
```
por:
```javascript
import { useEffect, useId, useState } from 'react';
```
Adicionar import da lib de analytics junto dos outros imports locais:
```javascript
import { track } from '../lib/analytics';
```

Dentro de `export default function Home() {`, logo depois das declarações de estado (perto da linha 23):
```javascript
  useEffect(() => {
    track('landing_viewed');
  }, []);
```

No bloco do `PlanCard` (perto da linha 308-318), adicionar `onCtaClick` junto do `ctaTo` já existente:
```jsx
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  cycleKey={cycleKey}
                  theme="dark"
                  highlighted={plan.id === recommendedPlanId}
                  badgeLabel={plan.id === recommendedPlanId ? 'Recomendado' : null}
                  ctaLabel="Testar grátis"
                  ctaTo={`/register?plan=${plan.id}&cycle=${cycleKey}`}
                  onCtaClick={() => track('plan_cta_clicked', { plan_id: plan.id, cycle: cycleKey })}
                />
```

- [ ] **Step 5: Editar `Pricing.jsx`**

Import da lib de analytics junto dos outros imports:
```javascript
import { track } from '../lib/analytics';
```

No bloco do `PlanCard` (linha ~73-81, conferir o `cycleKey` usado ali — já confirmado como `cycleKey` no estado do componente), adicionar o mesmo `onCtaClick`:
```jsx
                <PlanCard
                  ...
                  ctaTo={`/register?plan=${plan.id}&cycle=${cycleKey}`}
                  onCtaClick={() => track('plan_cta_clicked', { plan_id: plan.id, cycle: cycleKey })}
                />
```

(usar os props exatos já presentes no bloco real de `Pricing.jsx` ao aplicar o diff — o trecho acima mostra só o que muda, não o bloco inteiro.)

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run src/test/home.test.jsx src/test/pricing.page.test.jsx`
Expected: PASS

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS — atenção a `src/test/plans.test.jsx`, que usa `onCtaClick` via `PlanCard` dentro do fluxo de `handleSelectPlan`; a troca de `onClick={ctaTo ? undefined : onCtaClick}` por `onClick={onCtaClick}` não muda o comportamento existente ali (`Plans.jsx` nunca passa `ctaTo`), mas rodar a suíte inteira confirma.

- [ ] **Step 8: Commit**

```bash
git add src/components/billing/PlanCard.jsx src/pages/Home.jsx src/pages/Pricing.jsx src/test/home.test.jsx src/test/pricing.page.test.jsx
git commit -m "feat(analytics): track landing_viewed and plan_cta_clicked, fix PlanCard onClick being dropped when ctaTo is set (D9)"
```

---

### Task 5: `Register.jsx` — `register_submitted` e `trial_activated`

**Files:**
- Modify: `src/pages/auth/Register.jsx`
- Modify: `src/test/register.test.jsx`

**Interfaces:**
- Consumes: `track` (Task 1).

- [ ] **Step 1: Escrever os testes que falham**

Ler `src/pages/auth/Register.jsx` como está no momento de executar esta task antes de editar — se o plano de D4 (`backend/docs/superpowers/plans/2026-09-14-d4-document-signup-to-market-frontend.md`, Task 2) já rodou, o campo CPF já foi removido; se não, o campo CPF ainda existe. Este plano não depende de qual dos dois estados o arquivo está — só adiciona chamadas de `track()` nos pontos de sucesso já existentes, sem tocar no formulário em si.

Adicionar em `src/test/register.test.jsx`, no topo:
```javascript
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
```

E dois testes novos (adaptar os seletores de campo do formulário — nome/email/senha — conforme o estado atual do arquivo; se o campo CPF ainda existir nesse momento, preenchê-lo também para o submit funcionar):
```javascript
  it('tracks register_submitted with the plan intent flag after a successful signup', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/register?plan=plan-1']}>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('register_submitted', { has_plan_intent: true }));
  });

  it('tracks trial_activated after the trial endpoint succeeds', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('trial_activated'));
  });
```

O `beforeEach` do arquivo já faz `api.post.mockResolvedValue({ data: {} })`, que cobre o `POST /auth/trial` chamado dentro de `onSubmit` — nenhum mock adicional necessário pro segundo teste.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/register.test.jsx`
Expected: FAIL — `track` nunca é chamado.

- [ ] **Step 3: Editar `Register.jsx`**

Import junto dos outros:
```javascript
import { track } from '../../lib/analytics';
```

Em `onSubmit`, logo depois de `await registerUser({ ...userData, password: safePassword });` ter sucesso (ou seja, depois do bloco `try { await registerUser(...) } catch { ...; return; }`, antes de `savePlanIntent(...)`):
```javascript
    track('register_submitted', { has_plan_intent: Boolean(searchParams.get('plan')) });
```

Dentro do bloco de ativação de trial, logo depois de `await api.post('/auth/trial', {});` ter sucesso (antes do `toast.success('Conta criada! Seu teste grátis...')`):
```javascript
      track('trial_activated');
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/register.test.jsx`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/auth/Register.jsx src/test/register.test.jsx
git commit -m "feat(analytics): track register_submitted and trial_activated on the signup page (D9)"
```

---

### Task 6: `Plans.jsx` — `trial_activated`, `checkout_modal_opened`, `checkout_started`, `checkout_completed`

**Files:**
- Modify: `src/pages/auth/Plans.jsx`
- Modify: `src/test/plans.test.jsx`

**Interfaces:**
- Consumes: `track` (Task 1).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `src/test/plans.test.jsx`, no topo:
```javascript
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
```

Testes novos dentro do `describe('Plans', ...)`:
```javascript
  it('tracks checkout_modal_opened when a plan is selected', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));

    expect(track).toHaveBeenCalledWith('checkout_modal_opened', { plan_id: 'plan-essential' });
  });

  it('tracks checkout_started and checkout_completed for an invoice checkout redirect', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    fetchInvoiceCheckoutUrl.mockResolvedValue('https://pay.example/checkout');
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(track).toHaveBeenCalledWith('checkout_started', {
      plan_id: 'plan-essential', billing_mode: 'invoice', subscription_type: 'monthly',
    });
    await waitFor(() => expect(track).toHaveBeenCalledWith('checkout_completed', {
      plan_id: 'plan-essential', billing_mode: 'invoice', outcome: 'redirected_to_payment',
    }));
  });

  it('tracks checkout_completed as invoice_pending when the payment link is not ready', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('checkout_completed', {
      plan_id: 'plan-essential', billing_mode: 'invoice', outcome: 'invoice_pending',
    }));
  });

  it('tracks trial_activated when the free trial is activated from this page', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Comece grátis por 14 dias');
    await user.click(screen.getByRole('button', { name: /ativar teste grátis/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('trial_activated'));
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/plans.test.jsx`
Expected: FAIL — `track` nunca é chamado.

- [ ] **Step 3: Editar `Plans.jsx`**

Import junto dos outros:
```javascript
import { track } from '../../lib/analytics';
```

`handleSelectPlan` (linha 118-124) — adicionar no início:
```javascript
  const handleSelectPlan = (plan) => {
    track('checkout_modal_opened', { plan_id: plan.id });
    setSelectedPlan(plan);
```

`handleActivateTrial` (linha 176-188) — logo depois de `await api.post('/auth/trial', {});` ter sucesso, antes de `await refreshUser();`:
```javascript
      track('trial_activated');
```

`handleContract` (linha 126-174) — logo antes do `try { setSubmitting(true); ... }` (depois da validação de `typesDocument` já ter passado):
```javascript
    track('checkout_started', {
      plan_id: selectedPlan.id, billing_mode: billingMode, subscription_type: cycleKey,
    });

    try {
      setSubmitting(true);
```

No branch `invoice` (dentro do `if (billingMode === 'invoice') { ... }`), nos dois desfechos:
```javascript
        const checkoutUrl = data.invoice_id
          ? await fetchInvoiceCheckoutUrl(data.invoice_id).catch(() => null)
          : null;
        if (checkoutUrl) {
          track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'redirected_to_payment' });
          window.location.href = checkoutUrl;
          return;
        }
        track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'invoice_pending' });
        toast.success('Fatura gerada! O link de pagamento fica disponível em Configurações > Faturas.');
```

No branch `recurring` (depois do `if (billingMode === 'invoice') {...}`, no código que já existe pra recorrente):
```javascript
      if (data.checkout_url) {
        track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'redirected_to_payment' });
        window.location.href = data.checkout_url;
        return;
      }

      track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'invoice_pending' });
      toast.success('Assinatura iniciada. Acompanhe suas faturas em Configurações.');
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/plans.test.jsx`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/auth/Plans.jsx src/test/plans.test.jsx
git commit -m "feat(analytics): track the full checkout funnel on the plans page (D9)"
```

---

## Self-Review

**Cobertura do spec:** §6.1 (SDK/init) → Task 1. §6.2 (consentimento) → Task 2. §6.3 (tabela de eventos de funil, 7 linhas) — `landing_viewed`→Task 4, `plan_cta_clicked`→Task 4, `register_submitted`→Task 5, `trial_activated`→Tasks 5 e 6 (dois pontos de origem no frontend, conforme a própria tabela do spec lista `Register.jsx` **e** `Plans.jsx`), `checkout_modal_opened`/`checkout_started`/`checkout_completed`→Task 6. §6.4 (identify) → Task 3. §6.5 (env vars) → Task 1.

**Placeholder scan:** nenhum "TODO"/"implementar depois". As instruções de "ler o arquivo antes de editar" (Task 2 Step 5, Task 5 Step 1) são para escolher o ponto exato de inserção num JSX que não teve sua estrutura completa reproduzida no plano, ou pra lidar com a ordem de execução em relação ao plano de D4 — não são lacunas de comportamento.

**Consistência de tipos:** `track(event, properties)` e `identifyUser(user)` (Task 1) são usados com a mesma assinatura em todas as tasks seguintes. `outcome` em `checkout_completed` usa exatamente os dois valores do spec (`'redirected_to_payment'` | `'invoice_pending'`) nos dois branches (`invoice` e `recurring`) da Task 6, sem um terceiro valor inventado.

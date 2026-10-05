# Marketfy Frontend: alinhamento do checkout com o Mercado Pago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao checkout de assinatura uma pagina de retorno de verdade, corrigir o fluxo de contratacao por cartao (que hoje nunca mostra o link de pagamento) e dar ao usuario controle visivel sobre cancelamento, tudo sem quebrar links de checkout ja abertos antes do deploy.

**Architecture:** Uma pagina de retorno unica (`/billing/retorno`) substitui `/billing/success|cancel|expired`, que passam a redirecionar para ela (checkouts ja abertos continuam funcionando). O modal de contratacao em `Plans.jsx` passa a tratar o modo cartao como assincrono (cria a assinatura, depois faz polling do link de checkout), espelhando o padrao que `fetchInvoiceCheckoutUrl` ja usa para fatura. `Settings.jsx` ganha um botao de cancelar que so marca a intencao — o acesso continua ate o fim do periodo.

**Tech Stack:** React 18, React Router, Vitest + Testing Library, axios (via `src/lib/api.js`).

**Spec:** `../backend/docs/superpowers/specs/2026-09-15-mercadopago-checkout-alignment-design.md`

**Depende de:** `marketfy/backend/docs/superpowers/plans/2026-09-15-mercadopago-checkout-alignment-backend.md` publicado (endpoints `POST /billing/subscriptions/{id}/checkout`, `POST /billing/subscription/cancel`, `GET /billing/subscriptions/{id}/status`).

## Global Constraints

- `/billing/success`, `/billing/cancel`, `/billing/expired` e `/dashboard/fiscal/credits/return` continuam existindo como rotas (redirecionam, nunca 404) — checkouts ja abertos antes do deploy nao podem quebrar.
- Nenhum texto do modal de contratacao menciona boleto (o checkout do Mercado Pago so oferece Pix e cartao).
- `npm test` verde ao fim de cada task.
- Commits convencionais, terminando com `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Pagina `/billing/retorno` e redirecionamentos de compatibilidade

**Files:**
- Create: `src/pages/BillingReturn.jsx`
- Modify: `src/App.jsx`
- Test: `src/test/billingReturn.test.jsx`

**Interfaces:**
- Produces: rota `/billing/retorno?tipo=credits|invoice|subscription&ref=<id>`. Rotas `/billing/success`, `/billing/cancel`, `/billing/expired` viram redirecionamentos client-side para `/billing/retorno` preservando `tipo`/`ref` quando presentes na query string recebida (o billing-core ainda manda so `?` sem esses parametros para creditos/fatura hoje — nesse caso a pagina cai no estado generico "processando", que ja funciona sem eles, igual `CreditPaymentReturn` hoje).

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/billingReturn.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import BillingReturn from '../pages/BillingReturn';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/billing/retorno" element={<BillingReturn />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BillingReturn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('polls subscription live status and shows confirmed access', async () => {
    api.get.mockResolvedValue({ data: { status: 'active', provisional: true } });

    renderAt('/billing/retorno?tipo=subscription&ref=sub-local-1');

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/billing/subscriptions/sub-local-1/status'));
    expect(await screen.findByText(/acesso liberado/i)).toBeInTheDocument();
  });

  it('shows a waiting state while the subscription is still pending', async () => {
    api.get.mockResolvedValue({ data: { status: 'pending', provisional: false } });

    renderAt('/billing/retorno?tipo=subscription&ref=sub-local-1');

    expect(await screen.findByText(/aguardando confirma/i)).toBeInTheDocument();
  });

  it('shows generic processing state for invoice/credits without ref', async () => {
    renderAt('/billing/retorno?tipo=invoice');

    expect(await screen.findByText(/pagamento est.* sendo processado/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- billingReturn`
Expected: FAIL — `src/pages/BillingReturn.jsx` nao existe.

- [ ] **Step 3: Create the page**

```jsx
// src/pages/BillingReturn.jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

import api from '../lib/api';
import { Button } from '../components/ui/Button';

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : ms));

export default function BillingReturn() {
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get('tipo') || 'invoice';
  const ref = searchParams.get('ref');
  const [status, setStatus] = useState(null);
  const [provisional, setProvisional] = useState(false);

  useEffect(() => {
    if (tipo !== 'subscription' || !ref) return undefined;
    let cancelled = false;

    async function poll() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        try {
          const { data } = await api.get(`/billing/subscriptions/${ref}/status`);
          if (cancelled) return;
          setStatus(data.status);
          setProvisional(Boolean(data.provisional));
          if (data.status === 'active') return;
        } catch {
          // ignora e tenta de novo no proximo ciclo
        }
        await wait(POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [tipo, ref]);

  const confirmed = status === 'active';

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10 flex items-center justify-center">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm w-full">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${confirmed ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50'}`}>
          {confirmed ? <CheckCircle2 size={44} /> : <Clock size={44} className="animate-spin" />}
        </div>
        <h1 className="text-2xl font-black text-gray-900">
          {confirmed ? 'Acesso liberado!' : 'Pagamento está sendo processado'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-gray-500">
          {confirmed
            ? provisional
              ? 'Seu cartão foi autorizado. Seu acesso já está liberado enquanto confirmamos a primeira cobrança (leva até 1 hora).'
              : 'Sua assinatura está confirmada.'
            : tipo === 'subscription'
              ? 'Aguardando confirmação do Mercado Pago...'
              : 'Seu pagamento está sendo processado. Isso pode levar alguns instantes.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button className="font-black">Ir para o painel</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Wire the route and the compatibility redirects**

Em `src/App.jsx`, importar `BillingReturn` e adicionar as rotas (fora do `ProtectedRoute`, igual `/precos`/`/termos` — o usuario pode voltar do checkout com a sessao expirada e ainda assim precisa ver a confirmacao):

```jsx
<Route path="/billing/retorno" element={<BillingReturn />} />
<Route path="/billing/success" element={<Navigate to="/billing/retorno" replace />} />
<Route path="/billing/cancel" element={<Navigate to="/billing/retorno?status=cancel" replace />} />
<Route path="/billing/expired" element={<Navigate to="/billing/retorno?status=expired" replace />} />
```

Importar `Navigate` de `react-router-dom` no topo do arquivo (conferir se ja esta importado).

- [ ] **Step 5: Run test to verify it passes, then run the full suite**

Run: `npm test -- billingReturn`
Expected: PASS.

Run: `npm test`
Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add src/pages/BillingReturn.jsx src/App.jsx src/test/billingReturn.test.jsx
git commit -m "feat(billing): add a single checkout return page and redirect the old success/cancel/expired routes to it"
```

---

### Task 2: Helpers de API para checkout de assinatura, status e cancelamento

**Files:**
- Modify: `src/lib/api.js`
- Test: `src/test/billingApi.test.js` (estender — o arquivo ja testa `subscribePlan`/`getInvoices`, seguir o mesmo padrao)

**Interfaces:**
- Produces: `ensureSubscriptionCheckout(subscriptionId)`, `getSubscriptionLiveStatus(subscriptionId)`, `cancelSubscription()`.

- [ ] **Step 1: Write the failing tests**

Adicionar a `src/test/billingApi.test.js`, seguindo o padrao ja usado la para as outras funcoes exportadas de `api.js` (mock de `api.post`/`api.get` e assert da URL/payload chamados):

```js
it('ensureSubscriptionCheckout posts to the confirmation endpoint', async () => {
  await ensureSubscriptionCheckout('sub-local-1');
  expect(api.post).toHaveBeenCalledWith('/billing/subscriptions/sub-local-1/checkout');
});

it('getSubscriptionLiveStatus reads the live status endpoint', async () => {
  await getSubscriptionLiveStatus('sub-local-1');
  expect(api.get).toHaveBeenCalledWith('/billing/subscriptions/sub-local-1/status');
});

it('cancelSubscription posts to the cancel endpoint', async () => {
  await cancelSubscription();
  expect(api.post).toHaveBeenCalledWith('/billing/subscription/cancel');
});
```

Ajustar os imports no topo do arquivo de teste para incluir as tres funcoes novas junto das ja importadas de `../lib/api`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- billingApi`
Expected: FAIL — as tres funcoes nao existem em `api.js`.

- [ ] **Step 3: Add the functions**

Em `src/lib/api.js`, logo apos `export const retryInvoice = ...`:

```js
export const ensureSubscriptionCheckout = (subscriptionId) =>
  api.post(`/billing/subscriptions/${subscriptionId}/checkout`);

export const getSubscriptionLiveStatus = (subscriptionId) =>
  api.get(`/billing/subscriptions/${subscriptionId}/status`);

export const cancelSubscription = () =>
  api.post('/billing/subscription/cancel');
```

- [ ] **Step 4: Run test to verify it passes, then run the full suite**

Run: `npm test -- billingApi`
Expected: PASS.

Run: `npm test`
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.js src/test/billingApi.test.js
git commit -m "feat(billing-api): add subscription checkout confirmation, live status and cancel helpers"
```

---

### Task 3: Helper de polling do checkout de assinatura

Espelha `src/lib/invoiceCheckout.js`, que ja resolve exatamente esse problema para fatura.

**Files:**
- Create: `src/lib/subscriptionCheckout.js`
- Test: `src/test/subscriptionCheckout.test.js`

**Interfaces:**
- Consumes: `ensureSubscriptionCheckout` (Task 2).
- Produces: `fetchSubscriptionCheckoutUrl(subscriptionId) -> Promise<string | null>`.

- [ ] **Step 1: Write the failing test**

```js
// src/test/subscriptionCheckout.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureSubscriptionCheckout } from '../lib/api';
import { fetchSubscriptionCheckoutUrl } from '../lib/subscriptionCheckout';

vi.mock('../lib/api', () => ({
  ensureSubscriptionCheckout: vi.fn(),
}));

describe('fetchSubscriptionCheckoutUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the url immediately when the first call already has it', async () => {
    ensureSubscriptionCheckout.mockResolvedValue({ data: { checkout_url: 'https://pay/mp/x' } });
    const url = await fetchSubscriptionCheckoutUrl('sub-local-1');
    expect(url).toBe('https://pay/mp/x');
    expect(ensureSubscriptionCheckout).toHaveBeenCalledTimes(1);
  });

  it('polls until the url shows up', async () => {
    ensureSubscriptionCheckout
      .mockResolvedValueOnce({ data: { checkout_url: null } })
      .mockResolvedValueOnce({ data: { checkout_url: null } })
      .mockResolvedValueOnce({ data: { checkout_url: 'https://pay/mp/y' } });
    const url = await fetchSubscriptionCheckoutUrl('sub-local-1');
    expect(url).toBe('https://pay/mp/y');
    expect(ensureSubscriptionCheckout).toHaveBeenCalledTimes(3);
  });

  it('returns null when the url never shows up within the attempt budget', async () => {
    ensureSubscriptionCheckout.mockResolvedValue({ data: { checkout_url: null } });
    const url = await fetchSubscriptionCheckoutUrl('sub-local-1');
    expect(url).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- subscriptionCheckout`
Expected: FAIL — `src/lib/subscriptionCheckout.js` nao existe.

- [ ] **Step 3: Create the helper**

```js
// src/lib/subscriptionCheckout.js
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
```

- [ ] **Step 4: Run test to verify it passes, then run the full suite**

Run: `npm test -- subscriptionCheckout`
Expected: PASS.

Run: `npm test`
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/subscriptionCheckout.js src/test/subscriptionCheckout.test.js
git commit -m "feat(billing): poll the subscription checkout confirmation endpoint until the payment link is ready"
```

---

### Task 4: `Plans.jsx` — cartao assincrono, idempotencia por abertura de modal, textos corretos

**Files:**
- Modify: `src/pages/auth/Plans.jsx`
- Test: `src/test/plans.test.jsx` (estender — conferir os testes existentes de `handleContract` antes de editar, para nao duplicar cobertura)

**Interfaces:**
- Consumes: `fetchSubscriptionCheckoutUrl` (Task 3).

- [ ] **Step 1: Write the failing tests**

Adicionar a `src/test/plans.test.jsx`, seguindo o padrao ja usado la para o fluxo `billing_mode=invoice` (mock de `subscribePlan`, `window.location.href`, `toast`):

```jsx
it('polls for the subscription checkout url instead of expecting it in the subscribe response', async () => {
  subscribePlan.mockResolvedValue({ data: { subscription_id: 'sub-local-1', job_id: 'job-1' } });
  fetchSubscriptionCheckoutUrl.mockResolvedValue('https://pay/mp/x');

  // abrir o modal, selecionar "Cartao de credito" e submeter — seguir a mesma
  // sequencia de interacao ja usada no teste equivalente de billing_mode=invoice
  // deste arquivo, trocando so a selecao do metodo de pagamento.
  ...

  await waitFor(() => expect(fetchSubscriptionCheckoutUrl).toHaveBeenCalledWith('sub-local-1'));
  expect(window.location.href).toBe('https://pay/mp/x');
});

it('sends a fresh idempotency key each time the modal is opened', async () => {
  // abrir o modal, fechar, reabrir; capturar dto.idempotency_key das duas
  // chamadas de subscribePlan e assertar que sao diferentes.
  ...
});

it('does not mention boleto in the payment method copy', () => {
  // abrir o modal e assertar screen.queryByText(/boleto/i) === null
  ...
});
```

Escrever os tres testes completos seguindo a estrutura de render/interacao ja usada no restante do arquivo (`render(<MemoryRouter>...<Plans /></MemoryRouter>)`, mocks de `useAuth`/`usePublicPlans` ja configurados no `beforeEach` existente — reaproveitar tudo isso, so variando a interacao e o assert final de cada teste acima).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- plans`
Expected: FAIL — `Plans.jsx` ainda espera `data.checkout_url` direto na resposta de `subscribePlan` para o modo cartao, e a chave de idempotencia e omitida (`dto.document`/sem `idempotency_key`), e o texto ainda cita "PIX ou boleto".

- [ ] **Step 3: Add a fresh idempotency key per modal open**

Em `src/pages/auth/Plans.jsx`, importar `fetchSubscriptionCheckoutUrl` de `../../lib/subscriptionCheckout`.

No `handleSelectPlan`, gerar e guardar uma chave nova em estado (adicionar `const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(null);` junto dos outros `useState` do componente):

```js
  const handleSelectPlan = (plan) => {
    track('checkout_modal_opened', { plan_id: plan.id });
    setSelectedPlan(plan);
    setBillingMode('invoice');
    setBillingDocument('');
    setUseRegisteredDocument(true);
    setCheckoutIdempotencyKey(`mktf-sub:${user?.id || 'anon'}:${plan.id}:${Date.now()}`);
    setShowModal(true);
  };
```

- [ ] **Step 4: Send the key and handle the recurring branch asynchronously**

Em `handleContract`, trocar a chamada `subscribePlan({...})` para incluir `idempotency_key: checkoutIdempotencyKey`, e trocar todo o bloco `if (data.checkout_url) { ... }` (o ramo `billing_mode === 'recurring'` de sucesso, hoje logo apos o bloco de `invoice`) por:

```js
      if (billingMode === 'recurring') {
        const checkoutUrl = data.subscription_id
          ? await fetchSubscriptionCheckoutUrl(data.subscription_id).catch(() => null)
          : null;
        if (checkoutUrl) {
          track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'redirected_to_payment' });
          window.location.href = checkoutUrl;
          return;
        }
        track('checkout_completed', { plan_id: selectedPlan.id, billing_mode: billingMode, outcome: 'checkout_link_delayed' });
        toast.error('O link de pagamento está demorando para ficar pronto. Tente novamente em instantes em Configurações.');
        setShowModal(false);
        await refreshUser();
        navigate('/dashboard/settings');
        return;
      }
```

(remover as linhas antigas `if (data.checkout_url) { ... }` e o `toast.success('Assinatura iniciada...')`/`setShowModal(false); await refreshUser();` que vinham logo depois, ja cobertos pelo bloco acima).

- [ ] **Step 5: Fix the payment method copy**

No `<fieldset>` "Como você quer pagar?", trocar o texto do botao Pix/cartao de:

```jsx
<span className="flex items-center gap-2 font-bold"><FileText size={16} /> PIX ou boleto</span>
<span className="mt-1 block text-xs text-gray-500">Você recebe a fatura a cada período e paga manualmente.</span>
```

por:

```jsx
<span className="flex items-center gap-2 font-bold"><FileText size={16} /> Pix ou cartão</span>
<span className="mt-1 block text-xs text-gray-500">Você paga a cada período; sem renovação automática.</span>
```

- [ ] **Step 6: Run tests to verify they pass, then run the full suite**

Run: `npm test -- plans`
Expected: PASS.

Run: `npm test`
Expected: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add src/pages/auth/Plans.jsx src/test/plans.test.jsx
git commit -m "fix(billing): poll for the recurring checkout link, send a fresh idempotency key per modal open, fix payment method copy"
```

---

### Task 5: `Settings.jsx` — cancelar assinatura e mostrar o periodo garantido

**Files:**
- Modify: `src/pages/dashboard/Settings.jsx`
- Test: `src/test/settingsSubscriptionCancel.test.jsx`

**Interfaces:**
- Consumes: `cancelSubscription` (Task 2).

- [ ] **Step 1: Write the failing tests**

```jsx
// src/test/settingsSubscriptionCancel.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelSubscription } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import Settings from '../pages/dashboard/Settings';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
  cancelSubscription: vi.fn(),
}));
vi.mock('../hooks/useAuth');
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('Settings — cancelar assinatura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { name: 'Fulano', email: 'f@t.com', plan_expiration: '2026-12-01T00:00:00Z' },
      subscription: { status: 'active', billing_mode: 'recurring', expires_at: '2026-12-01T00:00:00Z', cancel_at_period_end: false },
      logout: vi.fn(),
      refreshSubscription: vi.fn(),
    });
  });

  it('shows the cancel button for an active subscription and confirms before calling the API', async () => {
    cancelSubscription.mockResolvedValue({ data: { status: 'canceled_at_period_end', expires_at: '2026-12-01T00:00:00Z' } });
    const user = userEvent.setup();
    render(<MemoryRouter><Settings /></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: /cancelar assinatura/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar cancelamento/i }));

    await waitFor(() => expect(cancelSubscription).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/ativa até/i)).toBeInTheDocument();
  });

  it('hides the cancel button once cancel_at_period_end is already true', async () => {
    useAuth.mockReturnValue({
      user: { name: 'Fulano', email: 'f@t.com', plan_expiration: '2026-12-01T00:00:00Z' },
      subscription: { status: 'active', billing_mode: 'recurring', expires_at: '2026-12-01T00:00:00Z', cancel_at_period_end: true },
      logout: vi.fn(),
      refreshSubscription: vi.fn(),
    });
    render(<MemoryRouter><Settings /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: /cancelar assinatura/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/ativa até/i)).toBeInTheDocument();
  });
});
```

Confira o mock de `../lib/api` ja usado em outros testes deste arquivo/diretorio (ex.: `billingInvoices.test.jsx`) para garantir que os `default.get` chamados pelo `useEffect` de carregamento de lojas em `Settings.jsx` nao quebram o teste — ajustar a lista de respostas mockadas conforme necessario.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- settingsSubscriptionCancel`
Expected: FAIL — nao existe botao "Cancelar assinatura" nem texto "ativa até".

- [ ] **Step 3: Add the cancel button and the "ativa até" copy**

Em `src/pages/dashboard/Settings.jsx`, importar `cancelSubscription` de `../../lib/api` e adicionar estado:

```js
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
```

No bloco "ASSINATURA (dados do Billing Core)" (a `<div>` que ja mostra `subStatusInfo`/`subscription.expires_at`), logo apos o parágrafo de vencimento existente, adicionar:

```jsx
                        {subscription.cancel_at_period_end && subscription.expires_at && (
                            <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-xs font-medium">
                                <Clock size={14} className="shrink-0" />
                                Assinatura cancelada — ativa até {formatDate(subscription.expires_at).split(' ')[0]}, sem nova cobrança.
                            </div>
                        )}

                        {['active', 'trialing'].includes(subscription.status) && !subscription.cancel_at_period_end && (
                            <>
                                {!showCancelConfirm ? (
                                    <button
                                        onClick={() => setShowCancelConfirm(true)}
                                        className="mt-3 text-xs font-bold text-red-500 hover:underline"
                                    >
                                        Cancelar assinatura
                                    </button>
                                ) : (
                                    <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-800">
                                        <p className="font-bold mb-2">
                                            Cancelar agora? Você mantém acesso até {subscription.expires_at ? formatDate(subscription.expires_at).split(' ')[0] : 'o fim do período pago'}, sem nova cobrança depois disso.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                isLoading={cancelingSubscription}
                                                onClick={async () => {
                                                    try {
                                                        setCancelingSubscription(true);
                                                        await cancelSubscription();
                                                        toast.success('Assinatura cancelada. Seu acesso continua até o fim do período pago.');
                                                        await refreshSubscription();
                                                        setShowCancelConfirm(false);
                                                    } catch (error) {
                                                        toast.error(error.response?.data?.detail || 'Erro ao cancelar assinatura.');
                                                    } finally {
                                                        setCancelingSubscription(false);
                                                    }
                                                }}
                                            >
                                                Confirmar cancelamento
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>Voltar</Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
```

Confirmar que `toast` (de `react-hot-toast`) ja esta importado no arquivo — se nao estiver, adicionar `import toast from 'react-hot-toast';` no topo (o arquivo hoje pode nao precisar dele; conferir antes de duplicar o import).

- [ ] **Step 4: Run tests to verify they pass, then run the full suite**

Run: `npm test -- settingsSubscriptionCancel`
Expected: PASS.

Run: `npm test`
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/Settings.jsx src/test/settingsSubscriptionCancel.test.jsx
git commit -m "feat(billing): add a cancel-subscription control that keeps access until the paid period ends"
```

---

## Self-Review Notes

- Cobertura da spec: pagina de retorno unica e redirecionamentos (Task 1), consulta de status ao vivo/acesso provisorio exibido ao usuario (Task 1), checkout de cartao assincrono (Task 3-4), idempotencia por abertura de modal (Task 4), textos sem "boleto" (Task 4), cancelamento com acesso garantido ate o fim do periodo (Task 5).
- Trocar de plano com uma assinatura recorrente ja ativa fica fora deste plano (ver a nota do plano de backend, Self-Review) — `Plans.jsx` continua permitindo abrir o modal de contratacao mesmo com assinatura ativa; antes de liberar troca de plano com recorrencia, o backend precisa da automacao de cancelar a antiga quando a nova confirma (sinalizado la como trabalho de acompanhamento). Ate isso existir, deixar como esta (usuario pode contratar de novo, mas precisa cancelar a antiga manualmente pela aba de Configuracoes) e aceitavel e nao piora o estado atual.
- Nenhum placeholder: cada passo tem o codigo completo ou a substituicao exata de trecho existente, exceto os pontos em que o plano pede para seguir literalmente o padrao de interacao ja escrito em um teste vizinho do mesmo arquivo (Task 4, Step 1 e Task 5 — sinalizados explicitamente, nao "implemente depois").

# Rodada 2 de Conversão — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os 3 gaps criados no PR #1, entregar o checkout de fatura em 1 passo e a projeção de créditos com a API que já existe, e — depois do deploy do backend da rodada 2 — trocar as heurísticas de plano (recomendado por posição, descrição genérica, CPF redigitado) por dados reais, com uma página pública `/precos`.

**Architecture:** React 18 + Vite SPA. Lógica pura em `src/lib/*` (testável sem render), componentes em `src/components/billing|fiscal`, páginas em `src/pages`. Toda leitura de `localStorage`/`import.meta.env` passa por um módulo pequeno em `src/lib` com `try/catch`. Front tolera ausência dos campos novos da API (defaults), para que a ordem de deploy não quebre a tela.

**Tech Stack:** React 18, react-router-dom 6, react-hook-form + zod, Tailwind 3, lucide-react, Vitest 4 + Testing Library (jsdom).

**Spec:** Handoff https://claude.ai/code/artifact/194d0a41-ee91-496a-b177-8fc938fe02e4 + plano original https://claude.ai/code/artifact/4b787f55-ad5f-4e6a-8194-29a224a52657. Plano irmão: `backend-marketfy/docs/superpowers/plans/2026-09-14-conversion-round2-backend.md` (tasks citadas como BE-N).

## Global Constraints

- Nenhuma copy nova pode afirmar algo que o código não faz. Reusar só claims já presentes no produto ("PDV offline e gestão em um só lugar", "Suporte incluído", "Sem fidelidade", "14 dias grátis, sem cartão") ou fatos verificados no backend (citados no passo).
- Nenhum dado de empresa (CNPJ, endereço, canal de vendas) é escrito no código: vem de `VITE_*` e some da tela quando não configurado.
- Decisões D1, D2, D4–D9 seguem abertas; nenhuma task depende delas.
- Testes em `src/test/*.test.js(x)`, padrão existente (`vi.mock('../lib/api', ...)`, `MemoryRouter` quando a página usa `Link`).
- Baseline antes de começar: `npm test` → 33 arquivos / 117 testes passando (medido em 2026-09-14). Cada task termina com a suíte inteira verde.
- Commits terminam com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Correções ao handoff (verificadas no código)

- **P2 não precisa de backend:** `POST /billing/invoices/{id}/checkout` já é idempotente e `BillingInvoices.jsx` já faz polling nele. → FE-1.
- **C5 não precisa de histórico diário:** `GET /fiscal/{market}/credits/balance` já traz `period` (`YYYYMM`), `used_count`, `remaining`. → FE-4.
- **D3 está respondida:** `0` bloqueia no backend (`Plan.is_limit_reached`, `FiscalQuotaService`). A copy atual "não incluído" está correta; nada a fazer.
- **P10 sem expor CPF:** em vez de `cpf` no `/auth/me`, o BE-5 expõe `document_masked` e aceita `document` omitido. → FE-8.
- **Novo:** `index.html` usa como favicon um logo externo do GitHub (`vitjs/vit`), não a marca. → FE-5.

## Ordem de execução

| Lote | Tasks | Depende de |
|---|---|---|
| A (já pode ir para produção) | FE-1, FE-2, FE-3, FE-4, FE-5 | nada |
| B (depois do deploy do backend) | FE-6 → FE-7, FE-8, FE-9 | BE-2, BE-3, BE-4, BE-5 em produção |

FE-6 não pode ir antes do backend: sem `is_recommended` na API nenhum card fica destacado (troca consciente — preferimos nenhum destaque a um destaque inventado). Depois do deploy, marcar o plano recomendado no admin (FE-7) no mesmo dia.

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `src/lib/invoiceCheckout.js` (novo) | Pedir checkout de fatura e esperar o link | 1 |
| `src/pages/dashboard/BillingInvoices.jsx` | Passa a usar `fetchInvoiceCheckoutUrl` | 1 |
| `src/pages/auth/Plans.jsx` | Checkout em 1 passo, intenção de plano, recomendado real, documento cadastrado | 1, 2, 6, 8 |
| `src/lib/planIntent.js` (novo) | Salvar/ler/limpar plano escolhido na landing | 2 |
| `src/pages/auth/Register.jsx` | Grava intenção; máscara de CPF | 2, 5 |
| `src/lib/company.js` (novo) | Dados legais e canal de vendas via env | 3 |
| `.env.example` (novo) | Documenta as variáveis `VITE_*` | 3 |
| `src/pages/Home.jsx` | Footer legal, link Business condicional, recomendado real, faixa "inclui", link `/precos` | 3, 6, 9 |
| `src/lib/fiscalProjection.js` (novo) | Ritmo de consumo e dias restantes | 4 |
| `src/components/fiscal/CreditsRunwayNotice.jsx` (novo) | Aviso "créditos acabam em X dias" | 4 |
| `src/pages/FiscalCredits.jsx` | Renderiza o aviso | 4 |
| `src/lib/documentMask.js` (novo) | Máscara de CPF | 5 |
| `index.html`, `public/favicon.svg`, `src/main.jsx`, `tailwind.config.js`, `package.json` | Favicon, OG/JSON-LD, fonte Inter empacotada | 5 |
| `src/components/admin/GrantFiscalCreditsModal.jsx`, `src/pages/admin/SaaSAdminDashboard.jsx` | Remover `animate-scale-in` inexistente | 5 |
| `src/lib/pricing.js` | `getRecommendedPlanId`, ordenação por `display_order` | 6 |
| `src/components/billing/PlanCard.jsx` | Sem descrição genérica, sem bullets repetidos | 6 |
| `src/components/billing/PlanIncludesStrip.jsx` (novo) | "Todos os planos incluem", uma vez por página | 6 |
| `src/pages/admin/PlansManagement.jsx` | Campos novos do plano | 7 |
| `src/pages/Pricing.jsx` (novo), `src/components/billing/PlanComparisonTable.jsx` (novo), `src/App.jsx` | Rota pública `/precos` | 9 |

---

## Lote A — sem dependência de backend

### Task FE-1: Checkout de fatura em 1 passo (P2)

**Files:**
- Create: `src/lib/invoiceCheckout.js`
- Modify: `src/pages/dashboard/BillingInvoices.jsx:33-54`
- Modify: `src/pages/auth/Plans.jsx:115-150` e rodapé do modal (`:325-335`)
- Test: `src/test/invoiceCheckout.test.js`, `src/test/plans.test.jsx`

**Interfaces:**
- Consumes: `requestInvoiceCheckout(invoiceId)` de `src/lib/api.js` (existente).
- Produces: `fetchInvoiceCheckoutUrl(invoiceId: string) => Promise<string|null>`.

- [ ] **Step 1: Write the failing test (lib)**

`src/test/invoiceCheckout.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestInvoiceCheckout } = vi.hoisted(() => ({ requestInvoiceCheckout: vi.fn() }));
vi.mock('../lib/api', () => ({ requestInvoiceCheckout }));

import { fetchInvoiceCheckoutUrl } from '../lib/invoiceCheckout';

describe('fetchInvoiceCheckoutUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the link immediately when it is ready', async () => {
    requestInvoiceCheckout.mockResolvedValue({ data: { checkout_url: 'https://pay.example/1' } });

    await expect(fetchInvoiceCheckoutUrl('inv-1')).resolves.toBe('https://pay.example/1');
    expect(requestInvoiceCheckout).toHaveBeenCalledTimes(1);
  });

  it('polls the same invoice until the link appears', async () => {
    requestInvoiceCheckout
      .mockResolvedValueOnce({ data: { checkout_url: null } })
      .mockResolvedValueOnce({ data: { checkout_url: 'https://pay.example/2' } });

    await expect(fetchInvoiceCheckoutUrl('inv-2')).resolves.toBe('https://pay.example/2');
    expect(requestInvoiceCheckout).toHaveBeenNthCalledWith(2, 'inv-2');
  });

  it('gives up with null after the attempts run out', async () => {
    requestInvoiceCheckout.mockResolvedValue({ data: { checkout_url: null } });

    await expect(fetchInvoiceCheckoutUrl('inv-3')).resolves.toBeNull();
    expect(requestInvoiceCheckout).toHaveBeenCalledTimes(11);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/invoiceCheckout.test.js`
Expected: FAIL — `Failed to resolve import "../lib/invoiceCheckout"`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/invoiceCheckout.js`:

```js
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
```

`src/pages/dashboard/BillingInvoices.jsx`: importar `fetchInvoiceCheckoutUrl` de `../../lib/invoiceCheckout` (remover `requestInvoiceCheckout` do import de `api` se não sobrar uso) e trocar o corpo de `handlePay` por:

```jsx
  const handlePay = async (invoice) => {
    try {
      setPaying(invoice.invoice_id);
      const url = await fetchInvoiceCheckoutUrl(invoice.invoice_id);
      if (url) { window.location.href = url; return; }
      toast.error('Link de pagamento ainda não disponível. Tente novamente em instantes.');
    } catch {
      toast.error('Erro ao abrir o pagamento.');
    } finally {
      setPaying(null);
    }
  };
```

- [ ] **Step 4: Run lib + invoices tests**

Run: `npx vitest run src/test/invoiceCheckout.test.js src/test/billingInvoices.test.jsx`
Expected: PASS (o mock de `../lib/api` em `billingInvoices.test.jsx` continua valendo, porque `invoiceCheckout.js` importa de `./api`).

- [ ] **Step 5: Write the failing Plans test**

Em `src/test/plans.test.jsx`:
- adicionar mock logo abaixo do mock de `useAuth`:

```jsx
vi.mock('../lib/invoiceCheckout', () => ({ fetchInvoiceCheckoutUrl: vi.fn() }));
```

  e o import `import { fetchInvoiceCheckoutUrl } from '../lib/invoiceCheckout';`
- no `beforeEach`, adicionar `fetchInvoiceCheckoutUrl.mockResolvedValue(null);` e `delete window.location; window.location = { href: '' };` — guardar o original em `const originalLocation = window.location;` no topo do arquivo e restaurar num `afterEach(() => { window.location = originalLocation; })` (importar `afterEach` de `vitest`).
- substituir o teste `generates an invoice and sends the user to the invoices tab instead of pretending to open checkout` pelos dois abaixo:

```jsx
  it('sends the user straight to payment after generating the invoice', async () => {
    const user = userEvent.setup();
    fetchInvoiceCheckoutUrl.mockResolvedValue('https://pay.example/checkout');
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ billing_mode: 'invoice', subscription_type: 'monthly' }));
    await waitFor(() => expect(fetchInvoiceCheckoutUrl).toHaveBeenCalledWith('invoice-1'));
    expect(window.location.href).toBe('https://pay.example/checkout');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to the invoices tab when the payment link is not ready', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard/settings?tab=invoices'));
  });
```

  (importar `waitFor` de `@testing-library/react`).

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/test/plans.test.jsx`
Expected: FAIL — botão "Ir para o pagamento" não existe no modo fatura.

- [ ] **Step 7: Implement in Plans.jsx**

- import: `import { fetchInvoiceCheckoutUrl } from '../../lib/invoiceCheckout';`
- em `handleContract`, trocar o bloco `if (billingMode === 'invoice') { ... }` por:

```jsx
      if (billingMode === 'invoice') {
        // A fatura ja existe; se o link nao sair (Billing Core lento/indisponivel)
        // o usuario continua o pagamento pela aba Faturas, sem erro de assinatura.
        const checkoutUrl = data.invoice_id
          ? await fetchInvoiceCheckoutUrl(data.invoice_id).catch(() => null)
          : null;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        toast.success('Fatura gerada! O link de pagamento fica disponível em Configurações > Faturas.');
        setShowModal(false);
        await refreshUser();
        navigate('/dashboard/settings?tab=invoices');
        return;
      }
```

- botão de submit: rótulo único `Ir para o pagamento <ArrowRight size={19} />` (remover o ternário).
- texto abaixo do botão:

```jsx
              <p className="text-center text-xs leading-5 text-gray-400">
                {billingMode === 'invoice'
                  ? 'Você será direcionado para pagar com PIX ou boleto.'
                  : 'Você será direcionado para concluir o pagamento com segurança.'}
              </p>
```

- [ ] **Step 8: Run full suite**

Run: `npm test`
Expected: PASS (118+ testes).

- [ ] **Step 9: Commit**

```bash
git add src/lib/invoiceCheckout.js src/pages/dashboard/BillingInvoices.jsx src/pages/auth/Plans.jsx src/test/invoiceCheckout.test.js src/test/plans.test.jsx
git commit -m "feat(plans): open invoice payment right after subscribing"
```

---

### Task FE-2: Intenção de plano ponta a ponta (gap 1)

**Files:**
- Create: `src/lib/planIntent.js`
- Modify: `src/pages/auth/Register.jsx:22-35,68`
- Modify: `src/pages/auth/Plans.jsx`
- Test: `src/test/planIntent.test.js`, `src/test/plans.test.jsx`

**Interfaces:**
- Produces: `savePlanIntent({ planId, cycle }, now?)`, `readPlanIntent(now?) => { planId, cycle } | null`, `clearPlanIntent()`; chave `localStorage` `marketfy_plan_intent`, validade 30 dias.

Por que `localStorage` e não `sessionStorage`: o trial dura 14 dias; a visita a `/plans` quase nunca acontece na mesma aba do cadastro. O conteúdo é só o id público do plano e o ciclo.

- [ ] **Step 1: Write the failing test**

`src/test/planIntent.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { clearPlanIntent, readPlanIntent, savePlanIntent } from '../lib/planIntent';

const DAY = 24 * 60 * 60 * 1000;

describe('planIntent', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the plan and cycle chosen on the landing', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'annual' }, 1_000);
    expect(readPlanIntent(1_000 + DAY)).toEqual({ planId: 'plan-pro', cycle: 'annual' });
  });

  it('ignores a call without plan', () => {
    savePlanIntent({ planId: null, cycle: 'annual' });
    expect(readPlanIntent()).toBeNull();
  });

  it('normalizes an unknown cycle to monthly', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'weekly' }, 0);
    expect(readPlanIntent(0)).toEqual({ planId: 'plan-pro', cycle: 'monthly' });
  });

  it('expires after 30 days and cleans the key', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'monthly' }, 0);
    expect(readPlanIntent(31 * DAY)).toBeNull();
    expect(localStorage.getItem('marketfy_plan_intent')).toBeNull();
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('marketfy_plan_intent', '{not json');
    expect(readPlanIntent()).toBeNull();
  });

  it('clears the intent', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'monthly' });
    clearPlanIntent();
    expect(readPlanIntent()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/planIntent.test.js`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

`src/lib/planIntent.js`:

```js
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
```

- [ ] **Step 4: Wire Register**

Em `src/pages/auth/Register.jsx`: apagar a função `storePlanIntent` e o comentário acima dela; importar `import { savePlanIntent } from '../../lib/planIntent';`; trocar `storePlanIntent(searchParams);` por:

```jsx
    savePlanIntent({ planId: searchParams.get('plan'), cycle: searchParams.get('cycle') });
```

- [ ] **Step 5: Write the failing Plans test**

Em `src/test/plans.test.jsx`, `beforeEach` ganha `localStorage.clear();` e adicionar:

```jsx
  it('resumes the plan chosen on the landing with its billing cycle', async () => {
    const user = userEvent.setup();
    localStorage.setItem('marketfy_plan_intent', JSON.stringify({ planId: 'plan-essential', cycle: 'annual', savedAt: Date.now() }));
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-trial' }, subscription: { status: 'trialing' } });

    expect(await screen.findByText(/você escolheu o/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /assinar plano essencial/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Anual')).toBeInTheDocument();
  });

  it('forgets the landing choice when the user wants to see every plan', async () => {
    const user = userEvent.setup();
    localStorage.setItem('marketfy_plan_intent', JSON.stringify({ planId: 'plan-essential', cycle: 'monthly', savedAt: Date.now() }));
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-trial' }, subscription: { status: 'trialing' } });

    await user.click(await screen.findByRole('button', { name: /ver todos os planos/i }));

    expect(screen.queryByText(/você escolheu o/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('marketfy_plan_intent')).toBeNull();
  });
```

(importar `within` de `@testing-library/react`).

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/test/plans.test.jsx`
Expected: FAIL — texto "Você escolheu o" não existe.

- [ ] **Step 7: Implement in Plans.jsx**

- import: `import { clearPlanIntent, readPlanIntent } from '../../lib/planIntent';`
- substituir `const [cycleKey, setCycleKey] = useState('monthly');` por:

```jsx
  const [planIntent, setPlanIntent] = useState(() => readPlanIntent());
  const [cycleKey, setCycleKey] = useState(() => planIntent?.cycle || 'monthly');
```

- depois de `const stageCopy = ...`:

```jsx
  const intendedPlan = planIntent ? plans.find((plan) => plan.id === planIntent.planId) : null;

  const handleDismissIntent = () => {
    clearPlanIntent();
    setPlanIntent(null);
  };
```

- em `handleContract`, logo depois do `await subscribePlan(...)` bem-sucedido: `clearPlanIntent();`
- renderizar logo depois da seção do trial (antes do `BillingCycleToggle`):

```jsx
        {intendedPlan && (
          <section
            aria-label="Plano escolhido"
            className="mx-auto mt-9 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row"
          >
            <p className="text-center text-sm text-gray-600 sm:text-left">
              Você escolheu o <strong className="text-gray-950">{intendedPlan.name}</strong> na página inicial.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={handleDismissIntent}>Ver todos os planos</Button>
              <Button size="sm" className="font-bold" onClick={() => handleSelectPlan(intendedPlan)}>
                Assinar {intendedPlan.name}
              </Button>
            </div>
          </section>
        )}
```

- [ ] **Step 8: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/planIntent.js src/pages/auth/Register.jsx src/pages/auth/Plans.jsx src/test/planIntent.test.js src/test/plans.test.jsx
git commit -m "feat(plans): resume the plan chosen on the landing"
```

---

### Task FE-3: Dados legais e canal de vendas por configuração (gap 2, L15)

**Files:**
- Create: `src/lib/company.js`, `.env.example`
- Modify: `src/pages/Home.jsx:322-330` (link Business) e footer (`:406-425`)
- Test: `src/test/company.test.js`, `src/test/home.test.jsx`

**Interfaces:**
- Produces: `getCompanyInfo(source = import.meta.env) => { legalName, cnpj, address, salesContactUrl }` (strings aparadas ou `null`).

- [ ] **Step 1: Write the failing test**

`src/test/company.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { getCompanyInfo } from '../lib/company';

describe('getCompanyInfo', () => {
  it('returns null for every field that is not configured', () => {
    expect(getCompanyInfo({})).toEqual({ legalName: null, cnpj: null, address: null, salesContactUrl: null });
  });

  it('trims configured values and treats blanks as missing', () => {
    expect(getCompanyInfo({
      VITE_COMPANY_LEGAL_NAME: '  Marketfy Tecnologia LTDA ',
      VITE_COMPANY_CNPJ: '00.000.000/0001-00',
      VITE_COMPANY_ADDRESS: '   ',
      VITE_SALES_CONTACT_URL: 'https://wa.me/5500000000000',
    })).toEqual({
      legalName: 'Marketfy Tecnologia LTDA',
      cnpj: '00.000.000/0001-00',
      address: null,
      salesContactUrl: 'https://wa.me/5500000000000',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/company.test.js`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Write minimal implementation**

`src/lib/company.js`:

```js
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
```

`.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
# Rodape legal da landing (mostrado so com razao social + CNPJ preenchidos)
VITE_COMPANY_LEGAL_NAME=
VITE_COMPANY_CNPJ=
VITE_COMPANY_ADDRESS=
# Link do canal de vendas do plano sob medida (WhatsApp, formulario, e-mail mailto:)
VITE_SALES_CONTACT_URL=
```

- [ ] **Step 4: Write the failing Home tests**

Em `src/test/home.test.jsx`, importar `afterEach` e adicionar `afterEach(() => vi.unstubAllEnvs());` e:

```jsx
  it('hides the tailored-plan contact when no sales channel is configured', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    await screen.findByText('Plano Essencial');

    expect(screen.queryByText(/rede com várias lojas/i)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="intent=business"]')).toBeNull();
  });

  it('links the tailored-plan contact to the configured sales channel', async () => {
    vi.stubEnv('VITE_SALES_CONTACT_URL', 'https://wa.me/5500000000000');
    render(<MemoryRouter><Home /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /fale com a gente/i });
    expect(link).toHaveAttribute('href', 'https://wa.me/5500000000000');
  });

  it('shows legal name and CNPJ in the footer only when configured', async () => {
    vi.stubEnv('VITE_COMPANY_LEGAL_NAME', 'Marketfy Tecnologia LTDA');
    vi.stubEnv('VITE_COMPANY_CNPJ', '00.000.000/0001-00');
    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText(/Marketfy Tecnologia LTDA · CNPJ 00\.000\.000\/0001-00/)).toBeInTheDocument();
  });
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/test/home.test.jsx`
Expected: FAIL — o link `?intent=business` ainda existe.

- [ ] **Step 6: Implement in Home.jsx**

- import: `import { getCompanyInfo } from '../lib/company';`
- no topo do componente: `const company = getCompanyInfo();`
- trocar o bloco `<div className="mt-10 text-center"> ... intent=business ... </div>` por:

```jsx
          {company.salesContactUrl && (
            <div className="mt-10 text-center">
              <p className="text-slate-400 text-sm">
                Rede com várias lojas ou operação de alto volume?{' '}
                <a
                  href={company.salesContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand-yellow hover:underline"
                >
                  Fale com a gente
                </a>
                .
              </p>
            </div>
          )}
```

- no footer, trocar o `<div className="text-center md:text-left">` por:

```jsx
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Marketfy. Todos os direitos reservados.</p>
            {company.legalName && company.cnpj && (
              <p className="mt-1 text-xs text-gray-400">
                {company.legalName} · CNPJ {company.cnpj}{company.address ? ` · ${company.address}` : ''}
              </p>
            )}
          </div>
```

- [ ] **Step 7: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/company.js .env.example src/pages/Home.jsx src/test/company.test.js src/test/home.test.jsx
git commit -m "feat(landing): drive legal footer and sales contact from env"
```

- [ ] **Step 9: Handoff manual (não é código)**

Pedir ao responsável: preencher `VITE_COMPANY_LEGAL_NAME`, `VITE_COMPANY_CNPJ`, `VITE_COMPANY_ADDRESS` e `VITE_SALES_CONTACT_URL` nas variáveis de ambiente da Vercel (Production e Preview) e fazer redeploy. Sem isso, L15 e L6 continuam só "sem dado falso", não "resolvidos".

---

### Task FE-4: Projeção de créditos fiscais (C5)

**Files:**
- Create: `src/lib/fiscalProjection.js`, `src/components/fiscal/CreditsRunwayNotice.jsx`
- Modify: `src/pages/FiscalCredits.jsx:229-237`
- Test: `src/test/fiscalProjection.test.js`

**Interfaces:**
- Consumes: `balance.period` (`"YYYYMM"`, gerado com `datetime.utcnow().strftime("%Y%m")` no backend), `balance.used_count`, `balance.remaining`.
- Produces: `projectCreditsRunway({ period, usedCount, remaining, now? }) => { dailyRate, daysLeft, daysUntilPeriodEnd, runsOutBeforePeriodEnd } | null`.

Limite conhecido: o período do backend é UTC e a conta aqui usa o fuso local; nas ~3h da virada do mês a projeção some (`null`). Aceitável para um aviso.

- [ ] **Step 1: Write the failing test**

`src/test/fiscalProjection.test.js`:

```js
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projectCreditsRunway } from '../lib/fiscalProjection';
import CreditsRunwayNotice from '../components/fiscal/CreditsRunwayNotice';

const now = new Date(2026, 8, 10, 12); // 10/09/2026 12h

describe('projectCreditsRunway', () => {
  it('projects days left from this month usage pace', () => {
    // 100 emissoes em 10 dias iniciados = 10/dia; 50 restantes = 5 dias; faltam 21 dias no mes.
    expect(projectCreditsRunway({ period: '202609', usedCount: 100, remaining: 50, now })).toEqual({
      dailyRate: 10,
      daysLeft: 5,
      daysUntilPeriodEnd: 21,
      runsOutBeforePeriodEnd: true,
    });
  });

  it('does not warn when the balance lasts until the end of the month', () => {
    const result = projectCreditsRunway({ period: '202609', usedCount: 10, remaining: 500, now });
    expect(result.runsOutBeforePeriodEnd).toBe(false);
  });

  it('has no pace to project without usage', () => {
    expect(projectCreditsRunway({ period: '202609', usedCount: 0, remaining: 50, now })).toMatchObject({
      dailyRate: 0, daysLeft: null, runsOutBeforePeriodEnd: false,
    });
  });

  it('returns null for a malformed period or a date outside of it', () => {
    expect(projectCreditsRunway({ period: '2026-09', usedCount: 1, remaining: 1, now })).toBeNull();
    expect(projectCreditsRunway({ period: '202608', usedCount: 1, remaining: 1, now })).toBeNull();
  });
});

describe('CreditsRunwayNotice', () => {
  it('warns how many days are left when credits run out before month end', () => {
    render(<CreditsRunwayNotice period="202609" usedCount={100} remaining={50} now={now} />);
    expect(screen.getByRole('status')).toHaveTextContent(/acabam em cerca de 5 dias/i);
  });

  it('renders nothing when there is no risk', () => {
    const { container } = render(<CreditsRunwayNotice period="202609" usedCount={10} remaining={500} now={now} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/fiscalProjection.test.js`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Write minimal implementation**

`src/lib/fiscalProjection.js`:

```js
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Projeta quando os creditos fiscais do periodo acabam, a partir do ritmo de
 * consumo do proprio mes (used_count / dias iniciados). A API de saldo so
 * expoe o acumulado do periodo, entao nao ha sazonalidade semanal aqui.
 */
export function projectCreditsRunway({ period, usedCount, remaining, now = new Date() }) {
  const match = /^(\d{4})(\d{2})$/.exec(String(period ?? ''));
  if (!match) return null;

  const periodStart = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const periodEnd = new Date(Number(match[1]), Number(match[2]), 1);
  if (now < periodStart || now >= periodEnd) return null;

  const used = Math.max(0, Number(usedCount) || 0);
  const left = Math.max(0, Number(remaining) || 0);
  const daysElapsed = Math.max(1, Math.ceil((now - periodStart) / MS_PER_DAY));
  const daysUntilPeriodEnd = Math.ceil((periodEnd - now) / MS_PER_DAY);

  if (used === 0) {
    return { dailyRate: 0, daysLeft: null, daysUntilPeriodEnd, runsOutBeforePeriodEnd: false };
  }

  const dailyRate = used / daysElapsed;
  const daysLeft = Math.floor(left / dailyRate);
  return { dailyRate, daysLeft, daysUntilPeriodEnd, runsOutBeforePeriodEnd: daysLeft < daysUntilPeriodEnd };
}
```

`src/components/fiscal/CreditsRunwayNotice.jsx`:

```jsx
import { AlertTriangle } from 'lucide-react';
import { projectCreditsRunway } from '../../lib/fiscalProjection';

export default function CreditsRunwayNotice({ period, usedCount, remaining, now }) {
  const projection = projectCreditsRunway({ period, usedCount, remaining, now });
  if (!projection?.runsOutBeforePeriodEnd) return null;

  const { daysLeft } = projection;
  const when = daysLeft === 0
    ? 'No ritmo atual, seus créditos acabam hoje.'
    : `No ritmo atual, seus créditos acabam em cerca de ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}, antes do fim do mês.`;

  return (
    <p
      role="status"
      className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{when} Compre um pacote abaixo para não interromper a emissão de NFC-e.</span>
    </p>
  );
}
```

`src/pages/FiscalCredits.jsx`: importar `CreditsRunwayNotice` e, no ramo `: (` que renderiza `CreditUsageBar`, envolver em fragmento:

```jsx
            ) : (
              <>
                <CreditUsageBar
                  used={balance?.used_count || 0}
                  includedLimit={balance?.included_limit || 0}
                  addonLimit={balance?.addon_limit || 0}
                  addonTotal={balance?.addon_total || 0}
                  period={balance?.period}
                />
                <CreditsRunwayNotice
                  period={balance?.period}
                  usedCount={balance?.used_count}
                  remaining={balance?.remaining}
                />
              </>
            )}
```

- [ ] **Step 4: Run full suite**

Run: `npm test`
Expected: PASS (inclusive `fiscalCredits.test.jsx`; se ele mockar um `period` do mês corrente com consumo alto e passar a achar dois `role="status"`, ajustar a query daquele teste para `getByRole('status', { name: ... })` ou `getAllByRole` — não remover o aviso).

- [ ] **Step 5: Commit**

```bash
git add src/lib/fiscalProjection.js src/components/fiscal/CreditsRunwayNotice.jsx src/pages/FiscalCredits.jsx src/test/fiscalProjection.test.js
git commit -m "feat(fiscal): warn when credits run out before month end"
```

---

### Task FE-5: Higiene transversal (R4 máscara, fonte, favicon, OG/JSON-LD, animações mortas)

**Files:**
- Create: `src/lib/documentMask.js`, `public/favicon.svg`
- Modify: `src/pages/auth/Register.jsx`, `index.html`, `src/main.jsx`, `tailwind.config.js`, `package.json`, `src/components/admin/GrantFiscalCreditsModal.jsx:99`, `src/pages/admin/SaaSAdminDashboard.jsx:372,412`
- Test: `src/test/documentMask.test.js`, `src/test/register.test.jsx`

**Interfaces:**
- Produces: `maskCpf(value: string) => string` (formata progressivamente até `000.000.000-00`), `onlyDigits(value) => string`.

- [ ] **Step 1: Write the failing tests**

`src/test/documentMask.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { maskCpf, onlyDigits } from '../lib/documentMask';

describe('maskCpf', () => {
  it.each([
    ['', ''],
    ['123', '123'],
    ['1234', '123.4'],
    ['1234567', '123.456.7'],
    ['12345678901', '123.456.789-01'],
    ['123.456.789-01999', '123.456.789-01'],
    ['abc123', '123'],
  ])('masks %s as %s', (input, expected) => {
    expect(maskCpf(input)).toBe(expected);
  });

  it('extracts digits', () => {
    expect(onlyDigits('123.456.789-01')).toBe('12345678901');
  });
});
```

`src/test/register.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '../pages/auth/Register';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const registerUser = vi.fn();
const login = vi.fn();

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ registerUser, login });
    registerUser.mockResolvedValue({});
    login.mockResolvedValue({});
    api.post.mockResolvedValue({ data: {} });
  });

  it('masks the CPF while typing and sends only digits', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    const cpf = screen.getByPlaceholderText('000.000.000-00');
    await user.type(cpf, '12345678901');
    expect(cpf).toHaveValue('123.456.789-01');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ cpf: '12345678901' })));
  });

  it('rejects a CPF with fewer than 11 digits', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('000.000.000-00'), '1234');
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    expect(await screen.findByText(/cpf deve ter 11 números/i)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/documentMask.test.js src/test/register.test.jsx`
Expected: FAIL — módulo inexistente e placeholder `000.000.000-00` não encontrado.

- [ ] **Step 3: Implement mask + Register**

`src/lib/documentMask.js`:

```js
export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Formata CPF progressivamente enquanto o usuario digita: 000.000.000-00. */
export function maskCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
```

Conferir o último replace com o caso `'1234567'` → `'123.456.7'` (o regex final exige 3 dígitos + 1-2, então não casa com `.7`) e `'12345678901'` → `'123.456.789-01'`. Se algum `it.each` falhar, ajustar a regex, não o teste.

`src/pages/auth/Register.jsx`:
- import: `import { maskCpf, onlyDigits } from '../../lib/documentMask';`
- schema: `cpf: z.string().refine((value) => onlyDigits(value).length === 11, 'CPF deve ter 11 números'),`
- em `onSubmit`: `const userData = { name: data.name, email: data.email, cpf: onlyDigits(data.cpf) };`
- antes do `return`: `const cpfField = register('cpf');`
- campo CPF:

```jsx
            <Input
              label="CPF"
              icon={FileText}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              error={errors.cpf?.message}
              {...cpfField}
              onChange={(event) => {
                event.target.value = maskCpf(event.target.value);
                cpfField.onChange(event);
              }}
            />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/documentMask.test.js src/test/register.test.jsx`
Expected: PASS.

- [ ] **Step 5: Fonte Inter empacotada (funciona offline no PDV)**

Run: `npm install @fontsource-variable/inter`

`src/main.jsx`, antes de `import './index.css';`: `import '@fontsource-variable/inter';`

`tailwind.config.js`: `sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],`

Google Fonts foi descartado de propósito: o PDV precisa funcionar sem internet e a fonte do CDN não estaria em cache.

- [ ] **Step 6: Favicon próprio, OG e JSON-LD**

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#FACC15"/><text x="32" y="44" font-family="system-ui,sans-serif" font-size="36" font-weight="900" text-anchor="middle" fill="#1F2937">M</text></svg>
```

Antes de usar o amarelo `#FACC15` e o escuro `#1F2937`, conferir os valores de `brand-yellow`/`brand-dark` em `tailwind.config.js` e usar esses.

`index.html`, no `<head>`, trocar o `<link rel="icon" ... vitjs ...>` por `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` e adicionar depois da `meta description`:

```html
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Marketfy" />
    <meta property="og:title" content="Marketfy — o caixa do seu mercado não para" />
    <meta property="og:description" content="PDV que funciona sem internet, estoque, fiado e emissão de NFC-e. Teste grátis por 14 dias." />
    <meta name="twitter:card" content="summary" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Marketfy",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "PDV offline, controle de estoque, fiado e emissão de NFC-e para mercados e varejos."
      }
    </script>
```

Sem `og:image` e sem `offers` no JSON-LD: não há imagem de marca no repositório e preço é dinâmico. `og:url` fica de fora até confirmar o domínio de produção.

- [ ] **Step 7: Remover `animate-scale-in` inexistente**

Apagar só o token `animate-scale-in` das classes em `src/components/admin/GrantFiscalCreditsModal.jsx:99` e `src/pages/admin/SaaSAdminDashboard.jsx:372,412`. Confirmar com `grep -rn "animate-scale-in" src` → nenhum resultado.

- [ ] **Step 8: Build + suíte**

Run: `npm test && npm run build`
Expected: testes PASS; build sem erro.

- [ ] **Step 9: Commit**

```bash
git add src/lib/documentMask.js src/pages/auth/Register.jsx src/test/documentMask.test.js src/test/register.test.jsx src/main.jsx tailwind.config.js package.json package-lock.json public/favicon.svg index.html src/components/admin/GrantFiscalCreditsModal.jsx src/pages/admin/SaaSAdminDashboard.jsx
git commit -m "chore(ui): cpf mask, bundled Inter, brand favicon and share metadata"
```

---

## Lote B — depois do deploy de BE-2..BE-5

### Task FE-6: Recomendado, descrição e ordem vindos da API (P4, P5)

**Files:**
- Create: `src/components/billing/PlanIncludesStrip.jsx`
- Modify: `src/lib/pricing.js:83-96`, `src/components/billing/PlanCard.jsx:67-70,105-109`, `src/pages/Home.jsx:25-28,305-320`, `src/pages/auth/Plans.jsx` (recommendedPlanId e grid)
- Test: `src/test/pricing.test.js`, `src/test/plans.test.jsx`, `src/test/home.test.jsx`

**Interfaces:**
- Consumes: `is_recommended`, `description`, `display_order` de `GET /identity/plans` (BE-3/BE-4).
- Produces: `getRecommendedPlanId(plans) => string|null`; `selectPublicPlans` ordena por `display_order` e depois `price_monthly`; `<PlanIncludesStrip theme="light"|"dark" />`.

- [ ] **Step 1: Write the failing tests**

`src/test/pricing.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { getRecommendedPlanId, selectPublicPlans } from '../lib/pricing';

const plan = (id, extra = {}) => ({ id, type: 'pago', is_active: true, price_monthly: 50, ...extra });

describe('getRecommendedPlanId', () => {
  it('uses the plan flagged by the business', () => {
    expect(getRecommendedPlanId([plan('a'), plan('b', { is_recommended: true }), plan('c')])).toBe('b');
  });

  it('never guesses by position when nothing is flagged', () => {
    expect(getRecommendedPlanId([plan('a'), plan('b'), plan('c')])).toBeNull();
    expect(getRecommendedPlanId(undefined)).toBeNull();
  });
});

describe('selectPublicPlans ordering', () => {
  it('orders by display_order and then by monthly price', () => {
    const plans = [
      plan('cheap-late', { display_order: 2, price_monthly: 10 }),
      plan('expensive-first', { display_order: 1, price_monthly: 900 }),
      plan('cheap-first', { display_order: 1, price_monthly: 20 }),
      plan('no-order', { price_monthly: 5 }),
    ];
    expect(selectPublicPlans(plans).map((p) => p.id)).toEqual(['no-order', 'cheap-first', 'expensive-first', 'cheap-late']);
  });
});
```

Em `src/test/plans.test.jsx` adicionar:

```jsx
  it('highlights only the plan the business marked as recommended', async () => {
    useAuth.mockReturnValue({ user: { name: 'Ana', plan_id: 'x' }, subscription: null, refreshUser, logout });
    api.get.mockResolvedValue({
      data: [
        { ...paidPlan, id: 'p1', name: 'Básico', price_monthly: 49.9 },
        { ...paidPlan, id: 'p2', name: 'Pro', price_monthly: 99.9, is_recommended: true },
        { ...paidPlan, id: 'p3', name: 'Rede', price_monthly: 199.9 },
      ],
    });
    render(<Plans />);

    expect(await screen.findAllByText('Recomendado')).toHaveLength(1);
    expect(screen.getByText('Recomendado').closest('article')).toHaveTextContent('Pro');
    expect(screen.getAllByText(/sem fidelidade/i)).toHaveLength(2); // faixa unica + nota do toggle, nunca 1 por card
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/pricing.test.js src/test/plans.test.jsx`
Expected: FAIL — `getRecommendedPlanId` não existe; badge "Mais escolhido" no plano do meio por posição.

- [ ] **Step 3: Implement pricing + strip + card**

`src/lib/pricing.js`:

```js
/**
 * Plano recomendado definido pelo admin (Plan.is_recommended). Sem marcacao,
 * nenhum card e destacado — nao escolhemos por posicao.
 */
export function getRecommendedPlanId(plans) {
  if (!Array.isArray(plans)) return null;
  return plans.find((plan) => plan.is_recommended)?.id ?? null;
}
```

e no `selectPublicPlans`, trocar o `.sort(...)` por:

```js
    .sort((a, b) => (Number(a.display_order || 0) - Number(b.display_order || 0))
      || (Number(a.price_monthly || 0) - Number(b.price_monthly || 0)));
```

(atualizar o comentário da função: "na ordem definida pelo admin e depois pelo preço mensal").

`src/components/billing/PlanIncludesStrip.jsx`:

```jsx
import { Check } from 'lucide-react';

const INCLUDED = ['PDV offline e gestão em um só lugar', 'Suporte incluído', 'Sem fidelidade'];

/** O que vale para todo plano pago, mostrado uma vez em vez de repetido em cada card. */
export default function PlanIncludesStrip({ theme = 'light' }) {
  const isDark = theme === 'dark';
  return (
    <section
      aria-label="Incluído em todos os planos"
      className={`mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
    >
      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Todos os planos incluem:</span>
      {INCLUDED.map((item) => (
        <span key={item} className="flex items-center gap-1.5">
          <Check size={16} className="shrink-0 text-emerald-500" /> {item}
        </span>
      ))}
    </section>
  );
}
```

`src/components/billing/PlanCard.jsx`:
- trocar o `<p className="mt-2 min-h-[40px] ...">{plan.description || '...'}</p>` por:

```jsx
        {plan.description && (
          <p className={`mt-2 text-sm leading-6 ${mutedText}`}>{plan.description}</p>
        )}
```

- apagar o bloco inteiro dos 3 bullets (`<div className={`mb-5 space-y-2 text-sm ...`}> ... Sem fidelidade</div></div>`) e remover `Check` do import se não sobrar uso.
- atualizar o comentário do componente ("Tudo que vale para todos os planos fica em PlanIncludesStrip").

- [ ] **Step 4: Use in Home and Plans**

`src/pages/Home.jsx`:
- import `getRecommendedPlanId` de `../lib/pricing` e `PlanIncludesStrip` de `../components/billing/PlanIncludesStrip`.
- trocar o comentário + `const recommendedPlanId = plans.length >= 3 ? ...` por `const recommendedPlanId = getRecommendedPlanId(plans);`
- renderizar `<PlanIncludesStrip theme="dark" />` logo depois do grid de `PlanCard` (dentro do ramo que tem planos).

`src/pages/auth/Plans.jsx`:
- import dos mesmos dois.
- `const recommendedPlanId = getRecommendedPlanId(plans);`
- `badgeLabel={plan.id === recommendedPlanId ? 'Recomendado' : null}` (era "Mais escolhido", que afirma popularidade sem dado).
- `<PlanIncludesStrip />` logo depois da `<section aria-label="Planos disponíveis">`, só quando `!loading && plans.length > 0`.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: PASS. Se `home.test.jsx` buscava "Sem fidelidade" dentro de card, atualizar para a faixa.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pricing.js src/components/billing/PlanIncludesStrip.jsx src/components/billing/PlanCard.jsx src/pages/Home.jsx src/pages/auth/Plans.jsx src/test/pricing.test.js src/test/plans.test.jsx src/test/home.test.jsx
git commit -m "feat(plans): use admin-defined recommendation, description and order"
```

---

### Task FE-7: Admin de planos com limite fiscal e campos de apresentação

**Files:**
- Modify: `src/pages/admin/PlansManagement.jsx:36-75,105-125,157-170`
- Test: `src/test/adminPlansManagement.test.jsx`

**Interfaces:**
- Consumes: `GET/POST/PUT /admin/plans` com `fiscal_monthly_limit`, `description`, `display_order`, `is_recommended` (BE-2/BE-3).

- [ ] **Step 1: Write the failing test**

`src/test/adminPlansManagement.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlansManagement from '../pages/admin/PlansManagement';
import api from '../lib/api';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const plan = {
  id: 'plan-pro', name: 'Pro', type: 'pago', is_active: true,
  max_markets: 2, max_terminals: 4, price_monthly: '99.90', price_180days: '539.90', price_annual: '999.90',
  fiscal_monthly_limit: 200, description: 'Para 2 lojas', display_order: 1, is_recommended: false,
};

describe('PlansManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [plan] });
    api.put.mockResolvedValue({ data: plan });
  });

  it('shows the fiscal limit on the plan card', async () => {
    render(<PlansManagement />);
    expect(await screen.findByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/NFC-e por mês/i)).toBeInTheDocument();
  });

  it('edits fiscal limit, description, order and recommendation', async () => {
    const user = userEvent.setup();
    render(<PlansManagement />);

    await user.click(await screen.findByRole('button', { name: /editar pro/i }));
    const limit = screen.getByLabelText(/emissões nfc-e por mês/i);
    await user.clear(limit);
    await user.type(limit, '500');
    const description = screen.getByLabelText(/descrição curta/i);
    await user.clear(description);
    await user.click(screen.getByLabelText(/plano recomendado/i));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/plans/plan-pro', expect.objectContaining({
      fiscal_monthly_limit: 500,
      description: null,
      display_order: 1,
      is_recommended: true,
    })));
  });
});
```

`getByLabelText` exige `<label htmlFor>` ligado ao campo. O `Input` compartilhado não liga `label` ao `input`; por isso os campos novos abaixo usam `id` + `<label htmlFor>` próprios.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/adminPlansManagement.test.jsx`
Expected: FAIL — botão "Editar Pro" sem nome acessível; campos inexistentes.

- [ ] **Step 3: Implement**

Em `handleOpenModal`, dentro do `if (plan)`:

```jsx
        setValue('fiscal_monthly_limit', plan.fiscal_monthly_limit ?? 0);
        setValue('description', plan.description ?? '');
        setValue('display_order', plan.display_order ?? 0);
        setValue('is_recommended', Boolean(plan.is_recommended));
```

e o `reset` do `else`: `reset({ type: 'pago', is_active: true, fiscal_monthly_limit: 0, description: '', display_order: 0, is_recommended: false });`

No `payload` de `handleSavePlan`:

```jsx
            fiscal_monthly_limit: parseInt(data.fiscal_monthly_limit || 0, 10),
            description: data.description?.trim() || null,
            display_order: parseInt(data.display_order || 0, 10),
            is_recommended: Boolean(data.is_recommended),
```

Botão de editar do card: adicionar `aria-label={`Editar ${plan.name}`}` e trocar `opacity-0 group-hover:opacity-100` por `opacity-60 group-hover:opacity-100 focus-within:opacity-100` (hoje é invisível para teclado).

No bloco de limites do card, depois de "PDVs por loja":

```jsx
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-brand-yellow" />
                                <span><strong>{plan.fiscal_monthly_limit ?? 0}</strong> NFC-e por mês</span>
                            </div>
                            {plan.is_recommended && (
                                <span className="inline-block rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-black uppercase text-brand-dark">Recomendado</span>
                            )}
```

(adicionar `FileText` ao import de `lucide-react`).

No formulário, depois da grade de "Max. Lojas / Max. Terminais":

```jsx
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="plan-fiscal-limit" className="text-sm font-medium text-gray-700">Emissões NFC-e por mês</label>
                                    <input id="plan-fiscal-limit" type="number" min="0" className="w-full border border-gray-300 rounded-lg p-2.5" {...register('fiscal_monthly_limit', { required: true, min: 0 })} />
                                    <span className="text-xs text-gray-400">0 = emissão não incluída no plano.</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="plan-display-order" className="text-sm font-medium text-gray-700">Ordem de exibição</label>
                                    <input id="plan-display-order" type="number" className="w-full border border-gray-300 rounded-lg p-2.5" {...register('display_order')} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="plan-description" className="text-sm font-medium text-gray-700">Descrição curta (aparece no card)</label>
                                <textarea id="plan-description" rows={2} maxLength={280} className="w-full border border-gray-300 rounded-lg p-2.5" {...register('description')} />
                            </div>
                            <label htmlFor="plan-recommended" className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <input id="plan-recommended" type="checkbox" {...register('is_recommended')} />
                                Plano recomendado (destacado na landing e em /plans; desmarca os outros)
                            </label>
```

- [ ] **Step 4: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/PlansManagement.jsx src/test/adminPlansManagement.test.jsx
git commit -m "feat(admin): manage fiscal limit and plan presentation fields"
```

- [ ] **Step 6: Operação pós-deploy (manual)**

No `/admin/plans` de produção: conferir o limite fiscal de cada plano (antes só editável no banco), preencher descrição e ordem, marcar o recomendado. Registrar no PR quem decidiu qual plano é o recomendado (é decisão de negócio, não de engenharia).

---

### Task FE-8: Documento cadastrado no checkout recorrente (P10)

**Files:**
- Modify: `src/pages/auth/Plans.jsx` (estado do modal, validação, campo)
- Test: `src/test/plans.test.jsx`

**Interfaces:**
- Consumes: `user.document_masked` de `GET /auth/me` e aceite de `document` omitido em `POST /billing/subscribe` (BE-5).

- [ ] **Step 1: Write the failing tests**

Em `src/test/plans.test.jsx`:

```jsx
  it('reuses the registered CPF for card billing without asking again', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null, document_masked: '***.456.789-**' } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /cartão de crédito/i }));

    expect(screen.getByLabelText(/usar o cpf do cadastro/i)).toBeChecked();
    expect(screen.queryByPlaceholderText(/somente números/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ billing_mode: 'recurring', document: undefined }));
  });

  it('asks for another document when the user unchecks the registered one', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null, document_masked: '***.456.789-**' } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /cartão de crédito/i }));
    await user.click(screen.getByLabelText(/usar o cpf do cadastro/i));
    await user.type(screen.getByPlaceholderText(/somente números/i), '98765432000110');
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ document: '98765432000110' }));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/plans.test.jsx`
Expected: FAIL — checkbox inexistente.

- [ ] **Step 3: Implement**

Estado, junto dos outros `useState` do modal:

```jsx
  const [useRegisteredDocument, setUseRegisteredDocument] = useState(true);
```

Depois de `const { user, ... } = useAuth();`:

```jsx
  const registeredDocument = user?.document_masked || null;
```

Em `handleSelectPlan`, adicionar `setUseRegisteredDocument(true);`.

Em `handleContract`, substituir a validação inicial por:

```jsx
    const typesDocument = billingMode === 'recurring' && !(registeredDocument && useRegisteredDocument);
    if (typesDocument && billingDocument.replace(/\D/g, '').length < 11) {
      toast.error('Informe um CPF ou CNPJ válido para cobrança recorrente.');
      return;
    }
```

e no `subscribePlan(...)`: `document: typesDocument ? billingDocument : undefined,`.

No JSX, substituir o bloco `{billingMode === 'recurring' && (<Input ... />)}` por:

```jsx
              {billingMode === 'recurring' && registeredDocument && (
                <label htmlFor="use-registered-document" className="flex items-start gap-2.5 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
                  <input
                    id="use-registered-document"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={useRegisteredDocument}
                    onChange={(event) => setUseRegisteredDocument(event.target.checked)}
                  />
                  <span>Usar o CPF do cadastro <strong className="font-mono">{registeredDocument}</strong></span>
                </label>
              )}

              {billingMode === 'recurring' && (!registeredDocument || !useRegisteredDocument) && (
                <Input
                  label="CPF ou CNPJ do titular"
                  placeholder="Somente números"
                  inputMode="numeric"
                  value={billingDocument}
                  onChange={(event) => setBillingDocument(event.target.value)}
                  autoFocus
                />
              )}
```

- [ ] **Step 4: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/auth/Plans.jsx src/test/plans.test.jsx
git commit -m "feat(plans): reuse registered CPF for recurring billing"
```

---

### Task FE-9: Página pública `/precos` com comparação e FAQ de cobrança (L19, P8)

**Files:**
- Create: `src/pages/Pricing.jsx`, `src/components/billing/PlanComparisonTable.jsx`
- Modify: `src/App.jsx:84-90`, `src/pages/Home.jsx` (footer)
- Test: `src/test/pricing.page.test.jsx`

**Interfaces:**
- Consumes: `usePublicPlans`, `getRecommendedPlanId`, `PlanCard`, `PlanIncludesStrip` (FE-6), `BillingCycleToggle`, `formatPlanLimit`/`formatFiscalLimit`/`getCycleTotal`/`getCycle`.
- Produces: rota pública `/precos`; `<PlanComparisonTable plans cycleKey />`.

Fatos usados no FAQ, todos verificados: PIX/boleto ou cartão recorrente (`SubscribeRequestDTO.billing_mode`); tolerância de 3 dias após o vencimento na cobrança por fatura (`SubscriptionStatus.GRACE_DAYS = 3`); pacotes adicionais de NFC-e (`/fiscal/credits/packages`); teste de 14 dias sem cartão (`activate_trial`, sem cobrança).

- [ ] **Step 1: Write the failing test**

`src/test/pricing.page.test.jsx`:

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Pricing from '../pages/Pricing';
import api from '../lib/api';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const plans = [
  { id: 'p1', name: 'Básico', type: 'pago', is_active: true, max_markets: 1, max_terminals: 1, fiscal_monthly_limit: 0, price_monthly: '49.90', price_180days: '269.90', price_annual: '499.90' },
  { id: 'p2', name: 'Pro', type: 'pago', is_active: true, is_recommended: true, max_markets: 3, max_terminals: 6, fiscal_monthly_limit: 300, price_monthly: '99.90', price_180days: '539.90', price_annual: '999.90' },
];

const renderPage = () => render(<MemoryRouter><Pricing /></MemoryRouter>);

describe('Pricing (/precos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: plans });
  });

  it('sends each plan CTA to signup with the plan and cycle', async () => {
    const user = userEvent.setup();
    renderPage();

    const proCard = (await screen.findByRole('heading', { name: 'Pro', level: 3 })).closest('article');
    expect(within(proCard).getByRole('link', { name: /testar grátis/i })).toHaveAttribute('href', '/register?plan=p2&cycle=monthly');

    await user.click(screen.getByRole('button', { name: 'Anual' }));
    expect(within(proCard).getByRole('link', { name: /testar grátis/i })).toHaveAttribute('href', '/register?plan=p2&cycle=annual');
  });

  it('compares real limits side by side', async () => {
    renderPage();
    const table = await screen.findByRole('table', { name: /comparar planos/i });

    expect(within(table).getByRole('columnheader', { name: 'Pro' })).toBeInTheDocument();
    expect(within(table).getByText('Até 3 lojas')).toBeInTheDocument();
    expect(within(table).getByText('Emissões fiscais não incluídas')).toBeInTheDocument();
  });

  it('answers billing questions with facts from the product', async () => {
    renderPage();
    await screen.findByRole('table', { name: /comparar planos/i });

    expect(screen.getByText(/quais formas de pagamento/i)).toBeInTheDocument();
    expect(screen.getByText(/3 dias de tolerância/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/pricing.page.test.jsx`
Expected: FAIL — `../pages/Pricing` inexistente.

- [ ] **Step 3: Comparison table**

`src/components/billing/PlanComparisonTable.jsx`:

```jsx
import { formatCurrency } from '../../lib/utils';
import { formatFiscalLimit, formatPlanLimit, getCycle, getCycleTotal } from '../../lib/pricing';

export default function PlanComparisonTable({ plans, cycleKey }) {
  const cycle = getCycle(cycleKey);
  const rows = [
    { label: 'Lojas', render: (plan) => formatPlanLimit(plan.max_markets, 'lojas') },
    { label: 'Caixas', render: (plan) => formatPlanLimit(plan.max_terminals, 'caixas') },
    { label: 'NFC-e', render: (plan) => formatFiscalLimit(plan.fiscal_monthly_limit) },
    { label: `Valor (${cycle.label.toLowerCase()})`, render: (plan) => formatCurrency(getCycleTotal(plan, cycleKey)) },
  ];

  return (
    <div className="mt-12 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">Comparar planos</caption>
        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">Recurso</th>
            {plans.map((plan) => (
              <th key={plan.id} scope="col" className="px-4 py-3 text-gray-900">{plan.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-100">
              <th scope="row" className="px-4 py-3 font-bold text-gray-700">{row.label}</th>
              {plans.map((plan) => (
                <td key={plan.id} className="px-4 py-3 text-gray-600">{row.render(plan)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`formatPlanLimit` retorna "Até 3 lojas" (verificar capitalização em `pricing.js` — é `Até ${n} ${unit}`).

- [ ] **Step 4: Page**

`src/pages/Pricing.jsx`:

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import BillingCycleToggle from '../components/billing/BillingCycleToggle';
import PlanCard from '../components/billing/PlanCard';
import PlanIncludesStrip from '../components/billing/PlanIncludesStrip';
import PlanComparisonTable from '../components/billing/PlanComparisonTable';
import { usePublicPlans } from '../hooks/usePublicPlans';
import { getRecommendedPlanId } from '../lib/pricing';

const BILLING_FAQ = [
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: 'PIX ou boleto, com uma fatura a cada período, ou cartão de crédito com renovação automática.',
  },
  {
    question: 'Preciso de cartão para testar?',
    answer: 'Não. O teste grátis de 14 dias não pede cartão nem gera cobrança.',
  },
  {
    question: 'O que acontece se a fatura vencer?',
    answer: 'Na cobrança por PIX ou boleto você tem 3 dias de tolerância depois do vencimento. Depois disso o acesso fica bloqueado até o pagamento, e seus dados continuam salvos.',
  },
  {
    question: 'E se eu passar do limite de NFC-e do plano?',
    answer: 'Você compra pacotes de emissões adicionais dentro do sistema, sem trocar de plano.',
  },
];

export default function Pricing() {
  const [cycleKey, setCycleKey] = useState('monthly');
  const { plans, loading } = usePublicPlans();
  const recommendedPlanId = getRecommendedPlanId(plans);

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans text-gray-800">
      <header className="border-b border-gray-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-xl font-black tracking-tight text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-yellow text-lg text-brand-dark">M</span>
            Marketfy
          </Link>
          <div className="flex items-center gap-2">
            <Button as={Link} to="/login" variant="ghost" className="font-bold">Entrar</Button>
            <Button as={Link} to="/register" className="font-bold">Testar grátis</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-gray-950 sm:text-5xl">Preços do Marketfy</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg">
            Comece com 14 dias grátis, sem cartão. Escolha um plano pelos limites que o seu negócio precisa.
          </p>
        </section>

        <div className="mt-9 flex justify-center">
          <BillingCycleToggle value={cycleKey} onChange={setCycleKey} theme="light" />
        </div>

        {loading ? (
          <div className="flex justify-center py-24" role="status" aria-label="Carregando planos">
            <Loader2 className="animate-spin text-brand-yellow" size={40} />
          </div>
        ) : plans.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-gray-500">Nenhum plano está disponível no momento. Tente novamente em instantes.</p>
        ) : (
          <>
            <section aria-label="Planos" className="mt-10 grid grid-cols-1 items-stretch justify-items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  cycleKey={cycleKey}
                  theme="light"
                  highlighted={plan.id === recommendedPlanId}
                  badgeLabel={plan.id === recommendedPlanId ? 'Recomendado' : null}
                  ctaLabel="Testar grátis"
                  ctaTo={`/register?plan=${plan.id}&cycle=${cycleKey}`}
                />
              ))}
            </section>
            <PlanIncludesStrip />
            <PlanComparisonTable plans={plans} cycleKey={cycleKey} />
          </>
        )}

        <section aria-labelledby="billing-faq" className="mx-auto mt-14 max-w-3xl">
          <h2 id="billing-faq" className="text-2xl font-black text-gray-950">Dúvidas sobre cobrança</h2>
          <div className="mt-5 space-y-3">
            {BILLING_FAQ.map((item) => (
              <details key={item.question} className="rounded-xl border border-gray-200 bg-white p-4">
                <summary className="cursor-pointer font-bold text-gray-900">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

`<details>` fechado mantém o texto no DOM, então `getByText(/3 dias de tolerância/i)` encontra a resposta.

- [ ] **Step 5: Route + link**

`src/App.jsx`: importar `Pricing from './pages/Pricing'` junto dos outros imports de página e adicionar `<Route path="/precos" element={<Pricing />} />` logo depois de `/privacidade`.

`src/pages/Home.jsx`, footer: adicionar `<Link to="/precos" className="hover:text-brand-dark hover:underline">Preços</Link>` antes de "Termos".

- [ ] **Step 6: Run full suite + build**

Run: `npm test && npm run build`
Expected: PASS; build ok. `vercel.json` já precisa reescrever rotas da SPA — confirmar que `/precos` abre direto (F5) no preview da Vercel.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Pricing.jsx src/components/billing/PlanComparisonTable.jsx src/App.jsx src/pages/Home.jsx src/test/pricing.page.test.jsx
git commit -m "feat(pricing): public /precos page with comparison and billing FAQ"
```

---

## Verificação final da rodada

- [ ] `npm test` verde e `npm run build` ok no front; `python -m pytest tests/unit -q` verde no back.
- [ ] Rodar o app (skill `run`) e percorrer no navegador: landing → card de plano → cadastro com CPF mascarado → dashboard (trial) → `/plans` mostra "Você escolheu o…" → assinar por fatura abre o checkout; `/precos` deslogado; `/dashboard/fiscal/credits` com consumo alto mostra o aviso.
- [ ] Atualizar o handoff com o novo placar (P2, P4, P5, P8, P10, L6*, L15*, L19, C5, R4*, gaps 1–2, fonte → feitos; *dependem das variáveis de ambiente/decisão D4).

## Fora desta rodada

| Item | Por quê |
|---|---|
| L2 prova social, L11 print/vídeo real do PDV | Precisa de material real (D8) |
| L16 páginas por vertical, F3 landing pós-pesquisa | Depende da pesquisa da seção 5 do plano original |
| U5 paywall com prévia, U6 régua de trial | Sem analytics (D9) não dá para medir; U6 também precisa de canal (e-mail/WhatsApp) |
| Eventos de analytics (8.3) | D9 |
| Termos/Privacidade definitivos (gap 3) | Revisão jurídica — FE-3 só prepara os dados da empresa |
| R4 aceitar CNPJ no cadastro, R9 login social | D4 / fora de escopo |
| Pré-renderização da landing e `/precos` | Mudança de infraestrutura (SSG), avaliar depois de medir tráfego orgânico |

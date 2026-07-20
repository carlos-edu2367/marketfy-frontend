# Marketfy Plans Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Redesign the authenticated Marketfy plans screen for higher clarity and conversion while preserving the existing API, database, and checkout contract.

**Architecture:** Keep the feature inside `src/pages/auth/Plans.jsx`, using the existing `/identity/plans` and `useAuth()` data. Add presentation helpers for plan limits and period labels, render the trial conditionally from `user.plan_id`, and preserve `subscribePlan` plus the existing billing modal flow. Add focused React tests in `src/test/plans.test.jsx` for trial visibility and plan-limit copy.

**Tech Stack:** React 18, React Testing Library, Vitest, Tailwind CSS, lucide-react, existing Marketfy API helpers.

## Global Constraints

- Do not modify backend code, database schema, API response contracts, or billing payloads.
- Hide the trial when `user?.plan_id` is truthy; show it only when the user has no plan.
- Display `max_markets`, `max_terminals`, and `fiscal_monthly_limit` from the existing plan response.
- Keep the existing billing modes (`invoice` and `recurring`) and `subscribePlan` call.
- Use visible labels, responsive layouts, and accessible button names.
- Follow TDD: each behavior test must fail before the implementation change.

---

### Task 1: Add behavior coverage for trial eligibility and visible plan limits

**Files:**
- Create: `src/test/plans.test.jsx`
- Read: `src/pages/auth/Plans.jsx`
- Read: `src/test/setup.js`

**Interfaces:**
- Consumes: `Plans` page, `useAuth`, `api.get('/identity/plans')`.
- Produces: regression coverage for trial visibility, fiscal emission copy, store/terminal limits, and the primary paid CTA.

- [ ] **Step 1: Write the failing tests**

Create a test module that mocks the existing API and auth hook, supplies one paid plan with `fiscal_monthly_limit: 200`, `max_markets: 3`, and `max_terminals: 6`, then asserts:

```jsx
it('hides the free trial for a user who already has a plan', async () => {
  renderPlans({ user: { name: 'Ana', plan_id: 'plan-existing' } });

  expect(await screen.findByText('Plano Essencial')).toBeInTheDocument();
  expect(screen.queryByText('Teste Grátis')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /ativar teste/i })).not.toBeInTheDocument();
});

it('shows trial and fiscal limits when the user has no plan', async () => {
  renderPlans({ user: { name: 'Ana', plan_id: null } });

  expect(await screen.findByText('Teste grátis por 14 dias')).toBeInTheDocument();
  expect(screen.getByText(/200 emissões fiscais por mês/i)).toBeInTheDocument();
  expect(screen.getByText(/até 3 lojas/i)).toBeInTheDocument();
  expect(screen.getByText(/até 6 caixas/i)).toBeInTheDocument();
});
```

Use a `renderPlans` helper that mocks `useAuth`, `useNavigate`, `api.get`, and `subscribePlan`, and return the paid plan response from `/identity/plans`. Keep the assertions user-visible; do not test Tailwind class names.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --run src/test/plans.test.jsx`

Expected: FAIL because the current screen always renders `Teste Grátis` and does not render `fiscal_monthly_limit`.

- [ ] **Step 3: Commit the red test**

```bash
git add src/test/plans.test.jsx
git commit -m "test: cover marketfy plans eligibility and limits"
```

### Task 2: Implement the centered conversion-focused plans layout

**Files:**
- Modify: `src/pages/auth/Plans.jsx`
- Test: `src/test/plans.test.jsx`

**Interfaces:**
- Consumes: existing plans response, `user.plan_id`, `subscribePlan`, `refreshUser`, and the existing billing modal state.
- Produces: a responsive plans screen with conditional trial, visible limitations, period selector, and unchanged checkout behavior.

- [ ] **Step 1: Add small presentation helpers before the component**

Add helpers with deterministic output:

```jsx
const formatLimit = (value, suffix) => {
  const numericValue = Number(value);
  return numericValue > 0 ? `Até ${numericValue} ${suffix}` : `Sem ${suffix} incluído`;
};

const formatFiscalLimit = (value) => {
  const numericValue = Number(value);
  return numericValue > 0
    ? `${numericValue.toLocaleString('pt-BR')} emissões fiscais por mês`
    : 'Emissões fiscais não incluídas';
};
```

- [ ] **Step 2: Replace the current header and hero copy**

Keep the Marketfy brand and logged-in user, but use a centered content width around `max-w-6xl`. Use copy equivalent to:

```jsx
<p className="...">Escolha o plano para o ritmo do seu negócio</p>
<h1>Venda mais com a operação sob controle.</h1>
<p>Tenha PDV, gestão e emissão fiscal em um só lugar. Compare os limites e escolha o plano que acompanha seu crescimento.</p>
```

Keep the expired-plan alert visible, but place it inside the same centered content column.

- [ ] **Step 3: Improve the billing-period selector**

Render the existing 30/180/365-day options as a single accessible segmented control. Include a small economy badge for semestral and annual options, use `aria-pressed`, and keep `selectedDuration` as the source of truth. Do not change the `getDurationKey` mapping.

- [ ] **Step 4: Render the trial only for users without a plan**

Change the trial card condition to `!user?.plan_id`. Rename the main offer copy to `Teste grátis por 14 dias`, keep the no-credit-card reassurance, and show the same existing trial action with an accessible label such as `Ativar teste grátis`. Do not add a new API call or trial-history field.

- [ ] **Step 5: Add a consistent paid-plan card structure**

For each active paid plan, render:

```jsx
<span>{formatLimit(plan.max_markets, 'lojas')}</span>
<span>{formatLimit(plan.max_terminals, 'caixas')}</span>
<span>{formatFiscalLimit(plan.fiscal_monthly_limit)}</span>
```

Add an explicit “Limitações do plano” section containing the same three capacity limits, so a user does not need to infer what “Até” means. Add concise benefits such as `PDV e gestão em um só lugar`, `Suporte incluído`, and `Sem fidelidade`, while avoiding claims not represented by the current product. Use “Escolher plano” or “Contratar plano” as the primary CTA.

- [ ] **Step 6: Highlight one recommended paid card without inventing backend data**

When there are at least three paid plans, visually emphasize the middle-priced plan with a `Mais escolhido` badge; otherwise do not add a recommendation badge. Keep card heights visually aligned through flex layout and a stable action footer.

- [ ] **Step 7: Refine the checkout modal without changing its contract**

Keep `billingMode`, `document`, `submitting`, `subscribePlan`, and `refreshUser` unchanged. Improve modal title, order summary, price period label, close button `aria-label`, and selected billing-mode states. Keep the existing recurring-document validation and checkout redirect behavior.

- [ ] **Step 8: Run the focused tests to verify green**

Run: `npm test -- --run src/test/plans.test.jsx`

Expected: PASS with the trial visibility and limits assertions passing.

- [ ] **Step 9: Commit the implementation**

```bash
git add src/pages/auth/Plans.jsx src/test/plans.test.jsx
git commit -m "feat: improve marketfy plans conversion screen"
```

### Task 3: Run full frontend verification and inspect the rendered screen

**Files:**
- Verify: `src/pages/auth/Plans.jsx`
- Verify: `src/test/plans.test.jsx`

**Interfaces:**
- Consumes: the completed frontend implementation and its test suite.
- Produces: fresh evidence from tests, lint, build, and a rendered-page inspection.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: exit code 0 with no failed tests.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors or warnings.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 and a generated `dist` bundle.

- [ ] **Step 4: Inspect the rendered page**

Start the existing Vite app with `npm run dev -- --host 127.0.0.1`, open the plans route in the in-app browser, and inspect desktop plus narrow viewport states. Verify centered alignment, card heights, trial visibility, readable limitations, modal opening, and no horizontal overflow.

- [ ] **Step 5: Review the final diff**

Run: `git diff HEAD~1 -- src/pages/auth/Plans.jsx src/test/plans.test.jsx` and `git status --short`.

Expected: only the approved plans-screen implementation and tests are changed, with no API or backend files modified.


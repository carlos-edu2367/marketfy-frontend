# Financial 403 Access Denial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a clear access-denied state when the Financial tab receives an HTTP 403.

**Architecture:** The existing `Financial` page owns the request lifecycle, so it will own a boolean authorization-error state. Its read-request catch blocks will set that state for 403 responses, and a page-level accessible alert will render before the loading fallback.

**Tech Stack:** React 18, Axios, Vitest, React Testing Library, Vite.

## Global Constraints

- Change only the Marketfy frontend `main` worktree; do not touch the PIX branch.
- Preserve generic error handling for statuses other than 403.
- Display the exact copy: `Você não tem acesso ao Financeiro desta loja.`
- Use `role="alert"` for the access-denied state.

---

### Task 1: Financial authorization-denial state

**Files:**
- Modify: `src/pages/dashboard/Financial.jsx`
- Create: `src/test/financial.test.jsx`

**Interfaces:**
- Consumes: Axios-shaped errors with `error.response.status` from `api.get`.
- Produces: a `role="alert"` Financial-page state with the specified access-denied copy for HTTP 403.

- [ ] **Step 1: Write the failing test**

```jsx
it('shows an access-denied message when the Financial API returns 403', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 403 } });

  render(<Financial />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Você não tem acesso ao Financeiro desta loja.'
  );
  expect(screen.queryByText(/consolidando dados financeiros/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/financial.test.jsx`

Expected: FAIL because the Financial page currently keeps the loading fallback after a 403.

- [ ] **Step 3: Write minimal implementation**

```jsx
const [accessDenied, setAccessDenied] = useState(false);

const isForbidden = (error) => error.response?.status === 403;

// In each Financial read-request catch block:
if (isForbidden(error)) {
  setAccessDenied(true);
} else {
  toast.error(existingMessage);
}

if (accessDenied) {
  return <div role="alert">Você não tem acesso ao Financeiro desta loja.</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/financial.test.jsx`

Expected: PASS with one access-denial test.

- [ ] **Step 5: Run regression verification**

Run: `npm test -- src/test/financial.test.jsx && npm run build`

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/dashboard/Financial.jsx src/test/financial.test.jsx
git commit -m "fix: show financial access denial"
```

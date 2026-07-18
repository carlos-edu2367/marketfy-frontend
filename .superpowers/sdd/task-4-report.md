# Task 4 — Customer credit-limit editing

## Scope delivered

- Added the accessible per-customer action `Editar limite de {nome}` and a credit-limit edit modal.
- Sends `PATCH /finance/{marketId}/customers/{customerId}` with a parsed numeric `credit_limit`.
- On success, updates `db.customers`, closes the modal, refreshes the customer list, and displays a success toast.
- Allows a limit below the current debt while warning that new credit sales remain blocked until debt falls below the limit.
- Rejects negative values, prevents repeated submissions while saving, and keeps the modal open on request errors.
- Customer-list available credit is now capped at zero.

## TDD evidence

### RED

Command: `npm.cmd test -- src/test/customersCreditLimit.test.jsx`

Result: failed with 2 tests, both because the accessible `Editar limite de Ana Souza` action did not exist. This confirmed the tests were exercising the missing behavior before production code was added.

### GREEN

Command: `npm.cmd test -- src/test/customersCreditLimit.test.jsx`

Result: passed — 1 file, 2 tests.

Coverage added:

- PATCH payload, local Dexie update, success toast, modal close, and list refresh.
- Warning for a limit lower than debt and a zero floor for available credit.

## Full verification

Command: `npm.cmd test`

Result: passed — 8 files, 35 tests.

`git diff --check` completed without whitespace errors. The test runner still reports pre-existing Vite/esbuild deprecation warnings; they are unrelated to this task.

# Financial 403 Access Denial Design

## Goal

Make an authorization denial in the Marketfy Financial tab understandable instead of presenting a generic loading or error state.

## Scope

- Detect HTTP 403 responses while loading the market list or a selected market's financial dashboard.
- Replace the Financial tab body with a visible, accessible access-denied message.
- Retain the existing generic error toast for every status other than 403.
- Do not change the API, authorization policy, navigation, plan guard, or the PIX branch.

## Design

`Financial` will keep an `accessDenied` boolean state. The two read request catch blocks set it only when `error.response?.status === 403`; other errors keep their current toast behavior. An access-denied view, rendered before the loading/data fallback, communicates that the current user lacks access to the selected market's Financial area and provides a link back to the dashboard.

The view uses `role="alert"` so assistive technology announces the authorization failure. A component test will mock a 403 from the market-list request and assert the Portuguese message is shown rather than the perpetual loading state.

## Acceptance Criteria

- A 403 from a Financial read request shows “Você não tem acesso ao Financeiro desta loja.”
- Other request failures still show their existing generic toast.
- The focused component test and the frontend build pass.

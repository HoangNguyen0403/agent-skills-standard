---
name: react-testing
description: Test React components with RTL and Jest/Vitest. Use when writing React component tests with React Testing Library, Jest, or Vitest.
metadata:
  triggers:
    files:
    - '**/*.test.tsx'
    - '**/*.spec.tsx'
    keywords:
    - render
    - screen
    - userEvent
    - expect
---
# React Testing

## **Priority: P1 (HIGH)**

## Core Philosophy

- **Test User Behavior, Not Implementation Mechanics**: Tests should verify that the application works for end users, rather than checking how components are implemented internally.
- **Resistance to Refactoring**: Refactoring component internal state, props, or hooks must never break passing tests as long as the user-visible behavior remains unchanged.

## Core Rule Anchors (Four Pillars Enforcement)

- **`[WEB-TEST-01]` Tripartite Naming & AAA Cadence**: Test names must follow `Method_Scenario_ExpectedBehavior` and adhere strictly to Arrange-Act-Assert. Example: `SubmitOrder_WhenCreditLimitExceeded_DisplaysBlockedBanner`.
- **`[WEB-TEST-02]` Accessible Roles & UserEvent**: Always use `userEvent.setup()` for user interactions (`await user.click(...)`) and query elements via accessible roles (`getByRole`, `findByLabelText`). Avoid `fireEvent` and ban arbitrary CSS / DOM hierarchy selectors.
- **`[WEB-TEST-03]` Ban on Component State & Prop Inspection**: Never inspect internal component state or props directly. Never write trivial echo assertions (`expect(true).toBe(true)`). Assert on visible user outcomes and DOM state changes.
- **`[WEB-TEST-04]` Mock Service Worker (MSW) Network Mocking**: Intercept network requests at the HTTP boundary via MSW rather than mocking internal Apollo Client hooks (`useQuery`) or Redux dispatchers. Tests must verify true end-to-end component data flow.
- **`[WEB-TEST-05]` Bug-First Regression Lock**: Every PR resolving a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.
- **`[WEB-TEST-06]` Ban on Static Artifact Pinning & Twin `.test.js` Suites**: Never assert on static `print(GQL)` query AST text or `.loc.source.body` substring matches (`GUARD-TS-STATIC-PINNING`); test the hook or query component. Never loop `Object.keys(locales/*.json)` or assert `typeof en[k] === 'string'`; assert user-visible rendered text via `findByText`/`getByRole`. Never create `<stem>.test.ts(x)` alongside legacy `<stem>.test.js(x)` (`GUARD-TS-DUAL-EXT`); migrate legacy files. Ban pass-through mock echoes (`expect(wrapper()).toBe(X)` without domain transformations).

## Implementation Guidelines

- **Standards**: Use **React Testing Library (RTL)** with **Vitest or Jest**. Follow **Arrange-Act-Assert (AAA)** pattern (`[WEB-TEST-01]`). Check for existing companion test files before creating new ones.
- **User-Centric Selection**: Prioritize accessible queries: **`getByRole`**, **`findByLabelText`**, **`getByText`**. Treat `data-testid` only as an explicit fallback for complex UI elements, and strictly ban CSS class or DOM hierarchy selectors (`[WEB-TEST-02]`).
- **Behavioral Assertions**: Test user workflows using **`userEvent.setup()`** (`await user.click(...)`) rather than `fireEvent` (`[WEB-TEST-02]`).
- **Network Boundary Mocking (MSW)**: Mock API network requests at HTTP layer using **MSW** instead of mocking Apollo Client hooks or Redux dispatchers (`[WEB-TEST-04]`). Never call real APIs in unit/integration tests.
- **TS Hygiene Invariants**: Always `await` promise assertions (`GUARD-TS-FLOATING-ASSERT`). Never assert only inside `catch` without an explicit failure guard in `try` (`GUARD-TS-CATCH-ONLY`). Never wrap assertions in unverified conditionals without `expect.hasAssertions()` (`GUARD-TS-CONDITIONAL-ASSERT`). Ban self-mocking and mocking the SUT (`GUARD-TS-SELF-MOCK`). Ban `setTimeout` fixed sleeps > 0ms (`GUARD-REACT-02` / `GUARD-E2E-01`); use `await screen.findBy*` or `waitFor`.

## Anti-Patterns & Banned Smells

- **`[WEB-TEST-01]` Vague test names**: Banish non-descriptive names; adhere to `Method_Scenario_ExpectedBehavior`.
- **`[WEB-TEST-02]` No Synthetic Events or CSS Selectors**: Avoid `fireEvent`; always use `userEvent.setup()`. Ban querying by CSS classes or DOM hierarchy.
- **`[WEB-TEST-03]` No Testing Implementation Details**: Never inspect component internal `state` or `props` directly.
- **`[WEB-TEST-04]` No Hook / Dispatcher Mocking**: Intercept network requests via MSW handlers.
- **`[WEB-TEST-05]` No Bug Fix Without Reproduction**: Ban bug fix PRs without defect reproduction tests.
- **`[WEB-TEST-06]` Static pinning & twin suites**: Ban `print(GQL)` regex pinning (`GUARD-TS-STATIC-PINNING`), locale JSON key loops, twin `.test.js` sidecars (`GUARD-TS-DUAL-EXT`), and pass-through mock echoes.
- **TS hygiene violations**: Ban floating promises (`GUARD-TS-FLOATING-ASSERT`), catch-only tests (`GUARD-TS-CATCH-ONLY`), unverified conditionals (`GUARD-TS-CONDITIONAL-ASSERT`), and fixed `setTimeout` sleeps (`GUARD-REACT-02`).
- **No Large Dynamic Snapshots**: Ban snapshot tests of dynamic pages, lists, or complex containers.
- **No Wait-for-Find**: Prefer `await screen.findBy*` over `waitFor(() => screen.getBy*)`.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for MSW API mocking, Context testing, form testing, and React Router patterns.

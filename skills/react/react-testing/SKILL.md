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

## Implementation Guidelines

- **Standards**: Use **React Testing Library (RTL)** with **Vitest or Jest**. Follow **Arrange-Act-Assert (AAA)** pattern (`[WEB-TEST-01]`).
- **User-Centric Selection**: Prioritize accessible queries: **`getByRole`**, **`findByLabelText`**, **`getByText`**. Treat `data-testid` only as an explicit fallback for complex UI elements, and strictly ban CSS class or DOM hierarchy selectors (`[WEB-TEST-02]`).
- **Behavioral Assertions**: Test user workflows using **`userEvent.setup()`** (e.g., `const user = userEvent.setup(); await user.click(...)`) rather than firing raw synthetic DOM events with `fireEvent` (`[WEB-TEST-02]`).
- **Network Boundary Mocking (MSW)**: Mock API network requests at the HTTP layer using **Mock Service Worker (MSW)** instead of mocking Apollo Client hooks (`useQuery`, `useMutation`) or Redux dispatchers. This validates end-to-end component data flow without leaking mock internals. **Never call real APIs** in unit/integration tests (`[WEB-TEST-04]`).
- **Asynchrony**: Use **`await screen.findBy*`** for elements rendered after asynchronous actions. Use **`waitFor(() => ...)`** only for complex non-element updates or assertion retries.
- **Architecture**: **Test behavior**, not implementation. Never inspect component internal `state` or `props` (`[WEB-TEST-03]`).
- **Mocks**: Mock expensive third-party libraries (e.g., `framer-motion`, `react-router`) or heavy assets at the boundary to speed up tests.
- **Visuals**: Use **Snapshot testing** sparingly for stable, small UI components. Banish large snapshot tests of dynamic pages. **Manual a11y checks** with `jest-axe`.

## Anti-Patterns & Banned Smells

- **`[WEB-TEST-01]` Vague test names**: Banish non-descriptive names; adhere to `Method_Scenario_ExpectedBehavior`.
- **`[WEB-TEST-02]` No Synthetic Events or CSS Selectors**: Avoid `fireEvent`; always use `userEvent.setup()`. Ban querying by CSS classes or DOM hierarchy.
- **`[WEB-TEST-03]` No Testing Implementation Details**: Never inspect or assert on component internal `state` or `props` directly.
- **`[WEB-TEST-04]` No Hook / Dispatcher Mocking**: Do not mock Apollo Client hooks or Redux dispatchers directly; intercept network requests via MSW handlers.
- **`[WEB-TEST-05]` No Bug Fix Without Reproduction**: Ban bug fix PRs without defect reproduction tests.
- **No Large Dynamic Snapshots**: Ban snapshot tests of dynamic pages, lists, or complex containers.
- **No Shallow Rendering**: Render the full component tree with required providers.
- **No Wait-for-Find**: Prefer `await screen.findBy*` over `waitFor(() => screen.getBy*)`.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for MSW API mocking, Context testing, form testing, and React Router patterns.

## Code

```tsx
test('submits form', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), 'test@test.com');
  await user.click(screen.getByRole('button', { name: /login/i }));

  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});
```

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- findByText
- getByRole

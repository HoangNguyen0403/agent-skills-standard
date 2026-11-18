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

Universal anti-slop rules (naming, identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps,
shallow assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only web deltas
follow.

## Core Philosophy

- **Test user behavior, not implementation mechanics**: verify the app works for users, not how components are built.
- **Resistance to refactoring**: changing internal state, props, or hooks must not break a test while user-visible behavior
  holds.

## Core Rule Anchors

- **`[WEB-TEST-01]` AAA Cadence**: Test names follow `Method_Scenario_ExpectedBehavior` (canonical A11) and every test uses
  Arrange-Act-Assert.
- **`[WEB-TEST-02]` Accessible Roles & UserEvent**: Use `userEvent.setup()` for interactions (`await user.click(...)`) and
  query by accessible role (`getByRole`, `findByLabelText`). Avoid `fireEvent`; ban CSS or DOM-hierarchy selectors.
- **`[WEB-TEST-03]` Ban Component State & Prop Inspection**: Never inspect internal state or props. Assert visible user
  outcomes and DOM changes.
- **`[WEB-TEST-04]` MSW Network Mocking**: Intercept at the HTTP boundary with MSW instead of mocking Apollo hooks (`useQuery`)
  or Redux dispatchers; tests must exercise real component data flow.
- **`[WEB-TEST-06]` Ban Static Artifact Pinning & Twin `.test.js` Suites**: Never assert static `print(GQL)` query AST text or
  `.loc.source.body` substrings (`GUARD-TS-STATIC-PINNING`); test the hook or query component. Never loop
  `Object.keys(locales/*.json)` or assert `typeof en[k] === 'string'`; assert rendered text via `findByText`/`getByRole`.
  Never keep `<stem>.test.tsx` beside a legacy `<stem>.test.jsx` (`GUARD-TS-DUAL-EXT`); migrate it. Ban pass-through mock
  echoes (`expect(wrapper()).toBe(X)` without domain transformations).

## Implementation Guidelines

- **Standards**: RTL with Vitest or Jest; AAA (`[WEB-TEST-01]`); reuse existing companion test files.
- **Selection**: Prefer `getByRole`, `findByLabelText`, `getByText`; `data-testid` only as an explicit fallback.
- **Behavioral Assertions**: `userEvent.setup()` over `fireEvent` (`[WEB-TEST-02]`).
- **Network Boundary**: MSW instead of Apollo/Redux mocking (`[WEB-TEST-04]`); never call real APIs in unit tests.
- **TS Hygiene**: Apply canonical rule A6 (`GUARD-TS-FLOATING-ASSERT`, `GUARD-TS-CATCH-ONLY`,
  `GUARD-TS-CONDITIONAL-ASSERT`, `GUARD-TS-SELF-MOCK`). Ban `setTimeout` sleeps > 0ms (`GUARD-REACT-02`); use
  `await screen.findBy*` or `waitFor`.

## Anti-Patterns & Banned Smells

- **Synthetic events or CSS selectors (`[WEB-TEST-02]`)**: Ban `fireEvent` and class/hierarchy queries.
- **Implementation details (`[WEB-TEST-03]`)**: No internal `state`/`props` inspection.
- **Hook / dispatcher mocking (`[WEB-TEST-04]`)**: Use MSW handlers.
- **Static pinning & twin suites (`[WEB-TEST-06]`)**: `GUARD-TS-STATIC-PINNING`, locale key loops, `GUARD-TS-DUAL-EXT`.
- **Fixed sleeps (`GUARD-REACT-02`)**: Ban `setTimeout` waits; prefer `await screen.findBy*` over `waitFor(() => screen.getBy*)`.
- **No large dynamic snapshots**: Ban snapshots of dynamic pages, lists, or complex containers.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for MSW API mocking, Context testing, form testing, and React Router
patterns.

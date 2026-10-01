---
name: react-native-testing
description: Test React Native components with Jest and React Native Testing Library. Use when writing Jest or React Native Testing Library tests for React Native components.
metadata:
  triggers:
    files:
    - '**/*.test.tsx'
    - '**/*.spec.tsx'
    - '__tests__/**'
    keywords:
    - test
    - testing
    - jest
    - render
    - fireEvent
    - waitFor
---
# React Native Testing

## **Priority: P1 (HIGH)**

## Core Rule Anchors

- **`[MOB-TEST-01]` Tripartite Naming**: Follow `Method_Scenario_ExpectedBehavior`.
- **`[MOB-TEST-02]` State & Component Invariant Rule**: Assert on visible user outcomes and accessible UI elements; never inspect component internal state or props directly.
- **`[MOB-TEST-03]` Entity Invariant Rule**: Test calculations, validations, and domain invariants; ban trivial echo assertions.
- **`[MOB-TEST-04]` Contract Testing Rule**: Intercept network requests at HTTP boundary (MSW) or native module boundary; ban 1:1 pass-through mock echoing without contract assertions.
- **`[MOB-TEST-05]` Bug-First Regression Lock**: Every PR resolving a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Setup & Component Testing

- **Jest & RNTL**: Use `@testing-library/react-native` for user-centric tests. Mock native modules with `jest.mock()`.
- **Component Example**:
```tsx
test('increments counter on button press', () => {
  const { getByText, getByRole } = render(<Counter />);
  fireEvent.press(getByRole('button', { name: /increment/i }));
  expect(getByText('Count: 1')).toBeTruthy();
});
```

## Best Practices

- **User-Centric**: Use `getByRole`, `getByText` over `testID`. Use `findBy*` for async elements.
- **Integration > Unit**: Test features, not implementation. Avoid brittle snapshots.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Anti-Patterns

- **No Testing Implementation**: Test behavior, not internals. Avoid `testID` overuse.
- **Banned Smells**: Ban vague names, inspecting component state/props, echo assertions, and pass-through mocks.

## References

See [references/testing-library.md](references/testing-library.md) for RNTL setup, mocking providers, and integration flow examples.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Integration
- RNTL

- Additional task-grounded exact anchors: test behavior
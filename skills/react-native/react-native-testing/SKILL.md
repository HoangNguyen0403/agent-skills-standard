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

## **Priority: P1 (OPERATIONAL)**

## Setup

- **Jest**: Pre-configured in React Native.
- **Testing Library**: Use `@testing-library/react-native` for user-centric tests.
- **Mocking**: Use `jest.mock()` for native modules.

## Component Testing

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';

test('increments counter on button press', () => {
  const { getByText, getByRole } = render(<Counter />);
  const button = getByRole('button', { name: /increment/i });

  fireEvent.press(button);

  expect(getByText('Count: 1')).toBeTruthy();
});
```

## Async Testing

```tsx
test('fetches and displays data', async () => {
  const { findByText } = render(<DataComponent />);
  const element = await findByText(/loaded data/i);
  expect(element).toBeTruthy();
});
```

## Best Practices

- **User-Centric**: Use `getByRole`, `getByText` over `testID` when possible.
- **Integration > Unit**: Test features, not implementation.
- **Avoid Snapshots**: Use sparingly. Brittle and hard to review.
- **Coverage**: Aim for 70%+. Focus on critical paths.

## Anti-Patterns

- **No Testing Implementation**: Test behavior, not internals.
- **No testID Overuse**: Prefer accessible queries.

## References

See [references/testing-library.md](references/testing-library.md) for RNTL setup, mocking providers, and integration flow examples.
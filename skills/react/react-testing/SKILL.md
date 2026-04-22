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

## **Priority: P2 (MAINTENANCE)**


## Implementation Guidelines

- **Standards**: Use **React Testing Library (RTL)** with **Vitest or Jest**. Follow **Arrange-Act-Assert (AAA)** pattern.
- **Selection**: Prefer **`getByRole`** / **`findByRole`** to test accessibility. Use **`data-testid`** only as fallback for complex UI.
- **Interactions**: Use **`userEvent` (async)** instead of `fireEvent` to better simulate browser events (e.g., `await user.click(element)`).
- **Asynchrony**: Use **`await screen.findBy*`** for elements that appear later. Use **`waitFor(() => ...)`** for complex non-element updates.
- **Networking**: Mock all API calls with **Mock Service Worker (MSW)**. **Never call real APIs** in unit/integration tests.
- **Architecture**: **Test behavior**, not implementation. Avoid checking internal `state` or `props`. Ensure **100% of P0 flows** covered.
- **Mocks**: **Mock expensive third-party libraries** (e.g., `framer-motion`, `react-router`) or heavy assets to speed up tests.
- **Visuals**: Use **Snapshot testing** sparingly for stable, small UI components. **Manual a11y checks** with `jest-axe`.

## Anti-Patterns

- **No Shallow Rendering**: Render full tree.
- **No Testing Implementation Details**: Don't check `component.state`.
- **No Wait**: Use `findBy`, avoid `waitFor` if possible.

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
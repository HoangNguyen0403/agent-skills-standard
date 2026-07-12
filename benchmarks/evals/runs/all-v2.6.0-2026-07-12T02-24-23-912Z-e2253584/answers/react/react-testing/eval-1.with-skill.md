Use RTL with the AAA pattern:

```tsx
render(<UserCard user={{ name: 'Alice', email: 'alice@test.com' }} />);
expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument();
```

Prefer `getByRole` for accessible behavior and avoid checking internal state.

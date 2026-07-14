Use `userEvent` asynchronously:

```tsx
const user = userEvent.setup();
await user.type(screen.getByLabelText(/email/i), 'test@test.com');
await user.click(screen.getByRole('button', { name: /submit/i }));
expect(await screen.findByText(/success/i)).toBeInTheDocument();
```

Prefer `findByText` for results that appear after submission and avoid `fireEvent` for normal user interactions.

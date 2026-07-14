Test the user-visible behavior with React Testing Library and `userEvent`, not the component's implementation details. Mock the submit boundary (Server Action or request) at the module/network boundary and render the form with its action:

```tsx
it('submits credentials and shows success', async () => {
  const user = userEvent.setup();
  mockLogin.mockResolvedValue({ ok: true });
  render(<LoginForm action={mockLogin} />);

  await user.type(screen.getByLabelText(/email/i), 'sam@example.com');
  await user.type(screen.getByLabelText(/password/i), 'correct-password');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByRole('status')).toHaveTextContent(/success/i);
  expect(mockLogin).toHaveBeenCalled();
});
```

Also test validation and rejected submissions. Use accessible labels/roles, await async UI changes, reset mocks between tests, and avoid asserting private state or exact DOM structure. If the form uses `useActionState`, return deterministic action states in the test double.


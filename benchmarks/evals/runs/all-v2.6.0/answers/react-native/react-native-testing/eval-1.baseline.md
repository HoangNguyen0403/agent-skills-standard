# Testing a button press

Use React Native Testing Library and test the user-visible result, not component internals:

```tsx
it('shows confirmation after pressing save', async () => {
  render(<SaveButton />);

  await userEvent.press(screen.getByRole('button', {name: /save/i}));

  expect(await screen.findByText(/saved/i)).toBeOnTheScreen();
});
```

Use an accessible role/name or test ID only when there is no suitable semantic query. If the press calls an async handler, await the interaction and use `findBy...` or `waitFor` for the resulting state. Mock network/native boundaries, not the button implementation, and assert the contract the user experiences: callback invocation, navigation, visible state, or validation. Keep tests deterministic, reset mocks between tests, and add a disabled/error case where it matters.


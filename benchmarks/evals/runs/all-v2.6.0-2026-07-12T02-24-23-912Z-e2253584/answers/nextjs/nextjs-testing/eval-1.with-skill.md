Use RTL with the project’s Jest/Vitest runner and `userEvent` to test behavior:

1. Render the login form with an MSW handler for the authentication request.
2. Locate fields and submit control with `getByRole`/`getByLabelText`.
3. `await user.type(...)` and `await user.click(...)`.
4. Assert the success message with `findByRole` or `findByText`.

Reset handlers and mocks after each test; avoid testing implementation details or making real network calls.


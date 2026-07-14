# JavaScript best practices

Use modern syntax, keep functions small and focused, and make data flow explicit:

- Prefer `const` by default; use `let` only when a binding must change. Avoid `var`.
- Use strict equality (`===`), descriptive names, early returns, and small pure functions where practical.
- Validate inputs at boundaries and handle expected errors deliberately.
- Prefer modules with one clear responsibility. Keep side effects at the edges of the application.
- Use `async`/`await` for asynchronous control flow, and handle rejection paths.
- Avoid mutating shared state; use immutable updates when they make behavior clearer.
- Use a formatter, linter, and automated tests in CI.

Choose conventions that match the project, document exceptions, and optimize only after measuring a real bottleneck.

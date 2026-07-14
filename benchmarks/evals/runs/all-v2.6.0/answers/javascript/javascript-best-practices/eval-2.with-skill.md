
Common anti-patterns to avoid in JavaScript include:

- Throwing strings or arbitrary values. Throw an `Error` object, and make sure every async operation has deliberate rejection handling.
- Defining mutable state on the global object. Keep state inside a module or function instead.
- Scattering magic numbers through business logic. Give them descriptive names, such as `const REQUEST_TIMEOUT_MS = 5000`.
- Deeply nested conditionals. Validate invalid input early and return or throw before the main path.
- Default exports and files that mix unrelated responsibilities. Keep one entity per file and expose the public surface through named exports from `index.js`.
- Functions that mutate shared data or perform surprising I/O. Prefer pure functions and make side effects explicit at the boundary.

Also keep imports organized as external, internal, and relative dependencies. Use `camelCase` for variables/functions, `PascalCase` for classes, and `UPPER_SNAKE` for constants; document public APIs with JSDoc that explains why unusual choices exist.

For a maintainable JavaScript implementation:

- Use `camelCase` for variables and functions, `PascalCase` for classes, and `UPPER_SNAKE` for constants.
- Keep one main entity per file. Put the public named exports in `index.js`, and order imports as external packages, internal modules, then relative modules.
- Throw `Error` objects rather than strings, and handle rejected promises at the boundary that can recover or report them.
- Add JSDoc to public APIs, explaining the reason for non-obvious decisions.
- Encapsulate mutable state, replace magic numbers with named `const` values, and use guard clauses to avoid deep nesting. Prefer pure functions with no hidden side effects.

Example:

```js
const MAX_RETRIES = 3;

/**
 * Retries an operation so transient failures do not fail the request immediately.
 * @param {() => Promise<unknown>} operation
 * @returns {Promise<unknown>}
 */
export async function retry(operation) {
  if (typeof operation !== 'function') {
    throw new Error('operation must be a function');
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
  }
}
```

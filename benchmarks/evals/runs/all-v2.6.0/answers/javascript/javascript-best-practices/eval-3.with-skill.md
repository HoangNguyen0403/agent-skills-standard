A small, idiomatic starting point is a pure named-exported function with validation, a named constant, and a JSDoc comment:

```js
const MAX_NAME_LENGTH = 80;

/**
 * Normalizes a display name so callers receive one predictable representation.
 * @param {string} value
 * @returns {string}
 */
export function normalizeName(value) {
  if (typeof value !== 'string') {
    throw new Error('name must be a string');
  }

  const name = value.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new Error('name has an invalid length');
  }

  return name;
}
```

Naming: use `camelCase` for functions and variables, `PascalCase` for classes, and `UPPER_SNAKE` for constants. Keep this entity in its own file and re-export it by name from `index.js`; avoid global state, magic numbers, deep nesting, default exports, and hidden side effects.

Comments: add JSDoc to public APIs and explain why a non-obvious rule exists, rather than repeating what the code already says. Handle async failures explicitly when the example grows to call external services.

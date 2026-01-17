---
name: JavaScript Language Patterns
description: Modern JavaScript (ES2022+) patterns for clean, maintainable code.
metadata:
  labels: [javascript, language, es6, modern-js]
  triggers:
    files: ['**/*.js', '**/*.mjs', '**/*.cjs']
    keywords:
      [const, let, arrow, async, await, promise, destructuring, spread, class]
---

# JavaScript Language Patterns

## **Priority: P0 (CRITICAL)**

Modern JavaScript standards for clean, maintainable code.

## Implementation Guidelines

- **Variables**: `const` default. `let` if needed. No `var`.
- **Functions**: Arrows for callbacks. Declarations for top-level.
- **Async**: `async/await` + `try/catch`.
- **Objects**: Destructuring, Spread `...`, Optional Chain `?.`, Nullish `??`.
- **Strings**: Template literals `${}`.
- **Arrays**: `map`, `filter`, `reduce`. No loops.
- **Modules**: ESM `import`/`export`.
- **Classes**: Use `#private` fields.

## Anti-Patterns

- **No `var`**: Block scope only.
- **No `==`**: Strict `===`.
- **No `new Object()`**: Use literals `{}`.
- **No Callbacks**: Promisify everything.
- **No Mutation**: Immutability first.

## Code

```javascript
// Modern Syntax
const [x, ...rest] = items;
const name = user?.profile?.name ?? 'Guest';

// Async
async function getUser(id) {
  try {
    const res = await fetch(`/api/${id}`);
    return res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// Class + Private
class Service {
  #key;
  constructor(k) {
    this.#key = k;
  }
}
```

## Reference & Examples

For advanced patterns and functional programming:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | tooling

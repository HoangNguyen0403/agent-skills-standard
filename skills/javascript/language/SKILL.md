---
name: JavaScript Language Patterns
description: Modern JavaScript (ES2022+) patterns for clean, maintainable code.
metadata:
  labels: [javascript, language, es6, modern-js]
  triggers:
    files: ['**/*.js', '**/*.mjs', '**/*.cjs']
    keywords: [const, let, arrow, async, await, promise, destructuring, spread, class]
---

# JavaScript Language Patterns

## **Priority: P0 (CRITICAL)**

Modern JavaScript standards for clean, maintainable code.

## Implementation Guidelines

- **Variables**: Use `const` by default. Use `let` only when reassignment is needed. Never use `var`.
- **Functions**: Prefer arrow functions for callbacks. Use function declarations for top-level functions.
- **Async/Await**: Prefer `async/await` over raw Promises. Always handle errors with try/catch.
- **Destructuring**: Use destructuring for objects and arrays to improve readability.
- **Spread Operator**: Use spread (`...`) for copying arrays/objects and function arguments.
- **Template Literals**: Use template literals for string interpolation instead of concatenation.
- **Optional Chaining**: Use `?.` to safely access nested properties.
- **Nullish Coalescing**: Use `??` instead of `||` for default values to avoid falsy value issues.
- **Array Methods**: Use `map`, `filter`, `reduce`, `find`, `some`, `every` instead of loops.
- **Modules**: Use ES6 modules (`import`/`export`) instead of CommonJS (`require`).
- **Classes**: Use class syntax for object-oriented programming. Use `#` for private fields.

## Anti-Patterns

- **No `var`**: Never use `var`. Use `const` or `let`.
- **No `==`**: Use strict equality `===` and `!==`.
- **No `new Object()`**: Use object literals `{}` and array literals `[]`.
- **No Callback Hell**: Use `async/await` instead of nested callbacks.
- **No Mutation**: Avoid mutating function arguments. Return new values instead.

## Code

```javascript
// Modern variable declarations
const MAX_USERS = 100;
let currentCount = 0;

// Arrow functions
const double = (x) => x * 2;
const users = data.map(user => ({ ...user, active: true }));

// Destructuring
const { name, email } = user;
const [first, second, ...rest] = items;

// Optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Guest';

// Async/await
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}

// Modern classes
class UserService {
  #apiKey; // Private field

  constructor(apiKey) {
    this.#apiKey = apiKey;
  }

  async getUser(id) {
    // Implementation
  }
}

// Array methods
const activeUsers = users.filter(user => user.active);
const totalAge = users.reduce((sum, user) => sum + user.age, 0);
const hasAdmin = users.some(user => user.role === 'admin');
```

## Reference & Examples

For advanced patterns and functional programming:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | tooling

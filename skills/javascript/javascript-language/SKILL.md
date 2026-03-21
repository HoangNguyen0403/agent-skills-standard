---
name: javascript-language
description: 'Modern JavaScript (ES2022+) patterns for clean, maintainable code. Use when working with modern JavaScript features like optional chaining, nullish coalescing, or ESM. (triggers: **/*.js, **/*.mjs, **/*.cjs, const, let, arrow, async, await, promise, destructuring, spread, class)'
---

# JavaScript Language Patterns

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Variables**: const default. let if needed. No var — block scope only.
- **Functionality**: Use **`Arrow Functions`** for callbacks/inlines; **`Function Declaration`** for core logic.
- **Async Logic**: Use async/await with try/catch and Promise.all() for parallel operations. ESM import/export only. No Callbacks — promisify everything.
- **Modern Syntax**: Use Destructuring, Spread (...), Optional Chain ?. and Nullish ?? coalescing.
- **String Handling**: Use **`Template Literals`** (backticks) for interpolation and multi-line strings.
- **Data Collections**: Prefer **`map`**, **`filter`**, and **`reduce`** over imperative `for` loops.
- **Modules**: Standardize on ESM import/export; use Named Exports over Default.
- **Encapsulation**: Leverage **`#private`** class fields for encapsulation.
- **Error States**: Throw **`new Error()`** with descriptive messages; never throw strings.

## Anti-Patterns

- No var — Block scope only.
- **No `==`**: Strict `===`.
- **No `new Object()`**: Use literals `{}`.
- No Callbacks: Promisify everything.
- **No Mutation**: Immutability first.

## Code

```javascript
// Modern Syntax
const [x, ...rest] = items;
const name = user?.profile?.name ?? 'Guest';

// Async + Error Handling
async function getUser(id) {
  const res = await fetch(`/api/${id}`);
  return res.json(); // Errors propagate
}

// Private Fields
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

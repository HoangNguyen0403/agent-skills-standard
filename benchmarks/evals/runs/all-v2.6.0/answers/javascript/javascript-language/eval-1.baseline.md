# Variable declarations in modern JavaScript

Use `const` by default:

```js
const apiUrl = '/api/users';
const options = { method: 'GET' };
```

Use `let` when the binding itself must be reassigned:

```js
let retryCount = 0;
retryCount += 1;
```

Avoid `var`; it is function-scoped, can be redeclared, and is hoisted in ways that make control flow harder to reason about. `const` prevents rebinding, but it does not make an object or array immutable; use immutable update patterns or `Object.freeze` when that guarantee is needed. Declare variables in the narrowest scope where they are used, and give them descriptive names.

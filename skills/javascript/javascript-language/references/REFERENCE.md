# JavaScript Language Patterns Reference

## Modern Syntax Examples

```javascript
// Destructuring + Spread
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

## Module Loaders

Decide by the consumer, not by preference:

| Existing artifact | Keep loading as | Do not |
| --- | --- | --- |
| `.cjs` file | CommonJS (`require`, `module.exports`) | Rename to `.mjs` or convert exports in place |
| `.js` under `"type": "commonjs"` | CommonJS | Add `import`/`export` syntax |
| `.js` under `"type": "module"` | ESM | Add `require`/`module.exports` |
| `.mjs` file | ESM | — |

```javascript
// CommonJS module preserved for existing consumers
const { readFile } = require('node:fs/promises');
exports.loadConfig = (path) => readFile(path, 'utf8').then(JSON.parse);
```

New modules: use ESM with named exports when the package's `type` and Node floor allow it.

```javascript
import { readFile } from 'node:fs/promises';

export async function loadConfig(path) {
  const text = await readFile(path, 'utf8');
  return JSON.parse(text);
}
```

## Callback Interop (selective promisification)

`util.promisify` requires a one-shot error-first callback as the **last** argument. It forwards `this`, so unbound receiver methods must be bound first.

```javascript
const { promisify } = require('node:util');

// One-shot error-first callback: safe to promisify
const readFileAsync = promisify(require('node:fs').readFile);

// Receiver-dependent method: bind before promisifying
class Repo {
  #rows = [];
  find(id, callback) { callback(null, this.#rows.find((r) => r.id === id)); }
}
const repo = new Repo();
const findAsync = promisify(repo.find).bind(repo);

// Non-standard callback shape: define promisify.custom
function onEvent(name, onSuccess, onError) { /* ... */ }
onEvent[promisify.custom] = (name) =>
  new Promise((resolve, reject) => onEvent(name, resolve, reject));
```

Do **not** promisify: functions that already return a Promise (deprecated since Node 20.8.0), repeated-event callbacks (`on('data')`), synchronous callbacks, or signatures where the callback is not last. Use native Promise APIs, async iterators, or an explicit `new Promise` wrapper instead.

## Functional Programming Patterns

```javascript
// Pure functions
const add = (a, b) => a + b;
const multiply = (a, b) => a * b;

// Function composition
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((v, f) => f(v), x);
const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((v, f) => f(v), x);

// Example usage
const addOne = (x) => x + 1;
const double = (x) => x * 2;
const addOneThenDouble = pipe(addOne, double);
console.log(addOneThenDouble(3)); // 8

// Immutable data updates
const updateUser = (user, updates) => ({
  ...user,
  ...updates,
  updatedAt: new Date(),
});

// Deep cloning
const deepClone = (obj) => structuredClone(obj);

// Currying
const curry = (fn) => {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...args2) => curried.apply(this, args.concat(args2));
  };
};

const add3 = curry((a, b, c) => a + b + c);
console.log(add3(1)(2)(3)); // 6
console.log(add3(1, 2)(3)); // 6
```

## Advanced Async Patterns

```javascript
// Promise.all for parallel execution
async function fetchAllUsers(ids) {
  const promises = ids.map((id) => fetch(`/api/users/${id}`));
  const responses = await Promise.all(promises);
  return Promise.all(responses.map((r) => r.json()));
}

// Promise.allSettled for handling partial failures
async function fetchWithFallback(urls) {
  const results = await Promise.allSettled(urls.map((url) => fetch(url)));

  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
}

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Debounce
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
```

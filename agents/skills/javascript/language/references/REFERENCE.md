# JavaScript Language Patterns Reference

Advanced patterns and functional programming techniques.

## References

- [**Functional Programming**](functional-programming.md) - Immutability and pure functions.
- [**Promises & Async**](promises-async.md) - Advanced async patterns.

## Functional Programming Patterns

```javascript
// Pure functions
const add = (a, b) => a + b;
const multiply = (a, b) => a * b;

// Function composition
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

// Example usage
const addOne = x => x + 1;
const double = x => x * 2;
const addOneThenDouble = pipe(addOne, double);
console.log(addOneThenDouble(3)); // 8

// Immutable data updates
const updateUser = (user, updates) => ({
  ...user,
  ...updates,
  updatedAt: new Date(),
});

// Deep cloning
const deepClone = obj => structuredClone(obj);

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
  const promises = ids.map(id => fetch(`/api/users/${id}`));
  const responses = await Promise.all(promises);
  return Promise.all(responses.map(r => r.json()));
}

// Promise.allSettled for handling partial failures
async function fetchWithFallback(urls) {
  const results = await Promise.allSettled(
    urls.map(url => fetch(url))
  );
  
  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
}

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
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
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

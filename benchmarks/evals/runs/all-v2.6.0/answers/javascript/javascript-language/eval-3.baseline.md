# Asynchronous code in modern JavaScript

Prefer promises and `async`/`await` for readable control flow:

```js
async function loadUsers() {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

try {
  const users = await loadUsers();
  console.log(users);
} catch (error) {
  console.error('Could not load users', error);
}
```

An `async` function always returns a promise, and a thrown error becomes a rejected promise, so callers must await it or attach a rejection handler. Run independent operations concurrently with `Promise.all` or `Promise.allSettled` rather than awaiting them serially. Pass cancellation, timeout, and retry behavior explicitly where network or long-running work requires them; avoid unhandled rejections and avoid mixing callback and promise styles unnecessarily.

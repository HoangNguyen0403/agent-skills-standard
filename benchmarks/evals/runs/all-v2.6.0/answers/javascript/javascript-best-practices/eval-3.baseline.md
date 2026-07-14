# Quick-start example

```js
// user-service.js
export async function loadActiveUser(id, fetchImpl = fetch) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError('id must be a positive integer');
  }

  const response = await fetchImpl(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load user: ${response.status}`);
  }

  const user = await response.json();
  if (user?.active !== true) {
    return null;
  }

  return { id: user.id, name: user.name };
}

try {
  const user = await loadActiveUser(42);
  console.log(user?.name ?? 'No active user');
} catch (error) {
  console.error('Unable to load user', error);
}
```

This example uses `const`, input validation, a focused function, dependency injection for testing, explicit HTTP error handling, optional chaining, nullish coalescing, and a handled async error path.

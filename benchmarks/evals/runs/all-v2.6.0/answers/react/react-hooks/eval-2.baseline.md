useEffect can fetch after mount in a client-only component, but it is not automatically the best data-loading mechanism. Prefer a framework loader or server data API when available, and use a query/cache library when caching, retries, deduplication, and invalidation matter.

For a small case, abort the request during cleanup:

~~~jsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/users', { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error('Request failed');
      return response.json();
    })
    .then(setUsers)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error);
    });

  return () => controller.abort();
}, []);
~~~

Handle loading and error states. Development Strict Mode may run setup and cleanup twice to expose unsafe effects.

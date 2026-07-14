# Fetching and caching API data

Use a server-state library such as TanStack Query rather than copying query data into `useState`. A query key identifies the request, and the library owns loading/error/data, caching, deduplication, refetching, stale time, retries, and invalidation:

```tsx
const query = useQuery({
  queryKey: ['users', userId],
  queryFn: () => api.getUser(userId),
});
```

Render `query.isPending`, `query.error`, and `query.data` directly. Use mutations for writes and invalidate or update the affected query on success. Configure cache/stale policies based on the data’s freshness needs, and persist/hydrate the cache only with an explicit offline/security policy. Keep form drafts and temporary UI state separate. Include cancellation or ignore-stale-result behavior where the client requires it, validate response data, and test cache hits, retries, invalidation, logout, and offline transitions.


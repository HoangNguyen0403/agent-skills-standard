Use `force-cache` when the response is public and can be reused until it is revalidated:

```ts
const data = await fetch(url, { cache: 'force-cache' }).then((r) => r.json());
```

Use `no-store` when every request must reach the origin, such as user-specific, rapidly changing, or authorization-sensitive data:

```ts
const data = await fetch(url, { cache: 'no-store' }).then((r) => r.json());
```

For the middle ground, use `next: { revalidate: seconds, tags: ['posts'] }` and invalidate the tag after a publish. In Next.js 15, do not rely on an old version's implicit caching defaults; state the policy explicitly and inspect any route/client caches as well. Never use a shared cache for data whose key omits the user or tenant. Check `response.ok`, keep secrets server-side, and choose the smallest cache scope that satisfies the freshness requirement.


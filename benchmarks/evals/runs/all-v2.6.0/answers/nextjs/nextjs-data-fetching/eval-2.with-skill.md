Use `force-cache` for public/static data that can be reused, and `no-store` for request-specific or highly fresh data:

```ts
fetch(url, { cache: 'force-cache' })
fetch(url, { cache: 'no-store' })
```

For periodic freshness, use `next: { revalidate: 60 }`; for targeted mutations, use tags and `revalidateTag`. Do not put user-specific responses in a shared cache, and verify behavior after mutations instead of relying on cache assumptions.


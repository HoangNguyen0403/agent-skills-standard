# Revalidate after the mutation

Invalidate the cache owned by the profile mutation, then refresh the affected UI. Prefer a data tag when the profile is fetched in several places:

```ts
revalidateTag(`profile:${userId}`)
```

Use `revalidatePath('/profile')` when the route itself is the correct ownership boundary, and `router.refresh()` when a Client Component needs to request a fresh server render. Ensure the read uses the same tag and that user-specific data is never placed in a shared cache. Test the complete mutation -> invalidation -> refreshed UI path.


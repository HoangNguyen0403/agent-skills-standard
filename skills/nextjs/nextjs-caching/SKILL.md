---
name: nextjs-caching
description: Configure Next.js cache layers, invalidation, and cache-component APIs. Use when choosing `fetch` caching, `use cache`, tags, or stale-data debugging in Next.js.
metadata:
  triggers:
    files:
    - '**/page.tsx'
    - '**/layout.tsx'
    - '**/action.ts'
    keywords:
    - unstable_cache
    - revalidateTag
    - Router Cache
    - Data Cache
---
# Caching Architecture

## **Priority: P1 (HIGH)**

## Decision Map

- **HTTP reads**: start with `fetch` cache controls (`force-cache`, `no-store`, `next.revalidate`, tags). For content updated a few times per day, ISR with `revalidate` is often the right default.
- **Custom function/component caching**: prefer `use cache` with `cacheLife()` and `cacheTag()` when the project uses cache components.
- **Per-render dedupe**: use React `cache()` for repeated server reads in one render pass.
- **Mutation invalidation**: `revalidateTag()` for data ownership, `revalidatePath()` for route-level refresh, `router.refresh()` for client view refresh after mutation.

## Recipe

1. **Classify the read**: static, periodically fresh, request-specific, or user-specific.
2. **Pick the narrowest cache**: request memoization before persistent cache, tag invalidation before path-wide invalidation.
3. **Tag what mutates together**: align tags with data ownership, not page names by habit.
4. **Keep personal data private**: avoid broad route caching for request-specific state.
5. **Test stale paths**: mutation -> invalidation -> refreshed UI.

## Verify

- [ ] Cache choice matches data ownership and freshness needs.
- [ ] Mutations revalidate the tags or paths they invalidate.
- [ ] User-specific data does not leak into shared cache.
- [ ] Slow reads stream behind `Suspense` instead of blocking the whole route.
- [ ] Existing code using `unstable_cache` has a migration note if cache components are now enabled.

| Layer | Where | Control |
| :---------------------- | :----- | :----------------------------- |
| **Request Memoization** | Server render | React `cache()` |
| **Data Cache** | Server | `fetch`, `use cache`, tags |
| **Full Route Cache** | Server | static rendering / revalidation |
| **Router Cache** | Client | `router.refresh()` |

## Anti-Patterns

- **No shared cache for personal data**: request-specific state needs a private strategy or no-store path.
- **No path-wide invalidation by habit**: prefer tags when data ownership is narrower.
- **No mutation without revalidation**: stale writes are correctness bugs.
- **No cache folklore**: verify with official cache docs for the project's enabled features.

## References

- [Framework Map](../references/framework-map.md)
- [Cache Components & PPR](references/CACHE_COMPONENTS.md)
- [Implementation Examples](references/implementation.md)

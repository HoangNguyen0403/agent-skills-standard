# Next.js Framework Map

Reviewed: 2026-06-17

Official sources:
- https://nextjs.org/docs
- https://nextjs.org/docs/app/getting-started/caching
- https://nextjs.org/docs/app/api-reference/directives/use-cache
- https://nextjs.org/docs/app/api-reference/functions/cacheLife
- https://nextjs.org/docs/app/api-reference/functions/cacheTag
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag

Notes:
- The caching docs above were updated on March 31, 2026.
- Treat App Router as the default unless the repo is explicitly on `pages/`.

## Default stance

- `nextjs-app-router`: route structure, layouts, loading, error, and segment rules.
- `nextjs-server-components`: default rendering model and client boundaries.
- `nextjs-caching`: cache layers, invalidation, and stale-data debugging.
- `nextjs-server-actions`: mutations, auth checks, form flow, revalidation.
- `nextjs-data-access-layer`: server-only data modules and DTO shaping.

## Architecture defaults

- Server Components by default. Add `'use client'` only at interactive leaves.
- Data access stays server-side in DAL or server-only modules.
- Cache strategy belongs next to the read path, not sprinkled across UI.
- Mutations own their revalidation plan.

## Cache decisions

- `fetch` + cache options: default choice for HTTP data.
- `use cache` + `cacheLife()` + `cacheTag()`: preferred for cacheable components/functions when cache components are enabled.
- `revalidateTag()`: selective invalidation after content mutations.
- `revalidatePath()`: route-level refresh when tags are too coarse or route shell changed.
- `router.refresh()`: client refresh after a mutation when a client view must refetch server state.

## Mutation workflow

- Validate input inside the action.
- Authenticate/authorize inside the action.
- Call DAL or service layer from the action; do not talk to raw storage from UI files.
- Revalidate tags/paths owned by the mutation.

## Smells that mean "load more skills"

- `page.tsx` mixes fetching, mutation logic, and client state.
- `'use client'` appears high in the tree.
- User-specific data is cached without a private strategy.
- Pages Router and App Router patterns are mixed in the same feature.

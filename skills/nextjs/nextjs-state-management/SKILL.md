---
name: nextjs-state-management
description: 'Best practices for managing state (Server URL vs Client Hooks). Use when managing URL state, client state, or global state in a Next.js application. (triggers: **/hooks/*.ts, **/store.ts, **/components/*.tsx, useState, useContext, zustand, redux)'
---

# State Management

## **Priority: P2 (MEDIUM)**

## Implementation Guidelines

- **URL State**: Use the URL as the Single Source of Truth for shareable/persistent state. URL params: shareable across reloads and links. Access via `useSearchParams()` and update with `useRouter()`. Pattern: `const params = new URLSearchParams(searchParams); params.set('q', term); useRouter().replace(...)` .
- **Server State**: Use **SWR** or **TanStack Query (React Query)** for caching and fetching server data. Avoid syncing server data manually into `useState`.
- **Client State**: Use Zustand (`create<CartState>()((set) => ({ ... }))`) — use only in 'use client' components — or Jotai for complex, high-frequency UI state. Avoid Prop Drilling by leveraging Context API only for low-frequency data.
- **Lifting State**: **Colocate state** as close as possible to the component. Only lift to the parent when state is shared between siblings.
- **Next.js 15+ Integration**: Ensure state updates in **Client Components** don't conflict with server-side rendering logic. Manage **optimistic updates** with the **`useOptimistic`** hook.
- **State Hydration**: Be careful when initializing state from `localStorage` in Client Components to avoid **Hydration Errors**. Wrap in `useEffect` or use a `mounted` flag.

### 2. URL-Driven State (Search/Filter)

Use `useSearchParams` + `useRouter` to update URL params. See [URL State Pattern](references/url-state.md).

### 3. Server State (TanStack Query / SWR)

If you need "Live" data on the client (e.g., polling stock prices, chat), do not implement `useEffect` fetch manually. Use a library.

```tsx
// Automated caching, deduplication, and revalidation with refreshInterval
const { data, error } = useSWR('/api/user', fetcher, {
  refreshInterval: 30000,
});
```

## Library Patterns

For specific state management patterns, see:

- [references/redux.md](references/redux.md)
- [references/zustand.md](references/zustand.md)
- [references/url-state.md](references/url-state.md)

## Anti-Patterns

- **No global store for simple state**: Use `useState` or URL params; avoid Zustand for basic UI.
- **No large objects in state**: Decompose into granular primitives to prevent extra re-renders.
- **No `useEffect` for data fetching**: Use SWR or TanStack Query for server state.
- **No server state in client stores**: Fetch in RSCs; client stores are for UI-only state.

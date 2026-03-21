---
name: nextjs-state-management
description: 'Best practices for managing state (Server URL vs Client Hooks). Use when managing URL state, client state, or global state in a Next.js application. (triggers: **/hooks/*.ts, **/store.ts, **/components/*.tsx, useState, useContext, zustand, redux)'
---

# State Management

## **Priority: P2 (MEDIUM)**

## Principles

1. **URL as Source of Truth**: For shareable/persistent state (Search, Filters, Pagination), use URL params with `useSearchParams`.
2. **Colocation**: Keep state close to components. Lift only when sharing between siblings.
3. **No Global Store Default**: Avoid Redux/Zustand for simple apps. Use only for complex cross-cutting concerns (Music Player, Shopping Cart).

## Patterns

### 1. Granular State (Best Practice)

Don't store large objects. Subscribe only to what you need to prevent unnecessary re-renders.

```tsx
// BAD: Re-renders on any change to 'user'
const [user, setUser] = useState({ name: '', stats: {}, friends: [] });

// GOOD: Independent states
const [name, setName] = useState('');
const [stats, setStats] = useState({});
```

### 2. URL-Driven State (Search/Filter)

Use `useSearchParams` + `useRouter` to update URL params. See [URL State Pattern](references/url-state.md).

### 3. Server State (TanStack Query / SWR)

If you need "Live" data on the client (e.g., polling stock prices, chat), do not implement `useEffect` fetch manually. Use a library.

```tsx
// Automated caching, deduplication, and revalidation
const { data, error } = useSWR('/api/user', fetcher);
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

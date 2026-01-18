---
name: Next.js State Management
description: Best practices for managing state (Server URL vs Client Hooks).
metadata:
  labels: [nextjs, state, zustand, context]
  triggers:
    files: ['**/hooks/*.ts', '**/store.ts', '**/components/*.tsx']
    keywords: [useState, useContext, zustand, redux]
---

# State Management

## **Priority: P2 (MEDIUM)**

Prefer Server State (URL) and Local State over Global Stores.

## Principles

1. **URL as Source of Truth**: For any state that should be shareable or persistent (Search queries, Filters, Pagination, Tabs), use the URL Search Params.
   - _Why_: Keeps state syncable across refreshes and shareable links.
   - _Tool_: `useSearchParams` hook.
2. **Colocation**: Keep state as close to the component as possible. **Do not lift state** unless necessary to share between siblings.
   - _Bad_: `App` component holding `searchTerm` for a `SearchBar` nested 5 levels deep.
   - _Good_: `SearchBar` has internal state, or `MainContent` holds it if it needs to pass to siblings.
3. **No Global Store Default**: Avoid Redux/Zustand for simple apps. Be skeptical of adding a library.
   - _Use Cases for Global Store_: Complex interactors like a Music Player (persists across navigation), Shopping Cart (shared everywhere).

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

```tsx
// Client Component
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export function Search() {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) params.set('q', term);
    else params.delete('q');

    // Updates URL -> Server Component re-renders with new params
    replace(`${pathname}?${params.toString()}`);
  }
}
```

### 3. Server State (TanStack Query / SWR)

If you need "Live" data on the client (e.g., polling stock prices, chat), do not implement `useEffect` fetch manually. Use a library.

```tsx
// Automated caching, deduplication, and revalidation
const { data, error } = useSWR('/api/user', fetcher);
```

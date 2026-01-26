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

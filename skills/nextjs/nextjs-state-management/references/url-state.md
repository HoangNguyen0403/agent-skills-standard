# URL-Driven State in Next.js

Best practices for using the URL as the source of truth for shareable state like search filters, pagination, and sorting in Next.js App Router.

## **Priority: P1 (STANDARD)**

Using the URL for state ensures that users can bookmark pages, share links with specific filters applied, and use the browser's back/forward buttons as expected.

## Core Principles

1. **URL as Source of Truth**: For any state that should be shareable or persist across page refreshes (e.g., search queries, active tabs, filters), use the URL.
2. **Read from `searchParams`**: In Server Components, access via the `searchParams` prop. In Client Components, use the `useSearchParams()` hook.
3. **Update with `useRouter`**: Use `router.push()` or `router.replace()` to update the URL.
4. **Debounce Search Inputs**: When updating the URL based on text input, use a debounce to avoid excessive navigation and re-renders.

## Implementation Example (Client Component)

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }

    startTransition(() => {
      replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className='relative'>
      <input
        type='text'
        placeholder='Search...'
        defaultValue={searchParams.get('query')?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        className='peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500'
      />
      {isPending && (
        <div className='absolute right-3 top-3 animate-spin'>🌀</div>
      )}
    </div>
  );
}
```

## Implementation Example (Server Component)

```tsx
import { Suspense } from 'react';
import { fetchFilteredData } from '@/lib/data';
import DataList from '@/components/DataList';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || '';
  const currentPage = Number(params.page) || 1;

  return (
    <main>
      <h1>Search Results</h1>
      <Suspense key={query + currentPage} fallback={<Skeleton />}>
        <DataList query={query} page={currentPage} />
      </Suspense>
    </main>
  );
}
```

## When to Use URL vs. Local State

| State Type        | Storage Location      | Shareable? | Example                          |
| :---------------- | :-------------------- | :--------- | :------------------------------- |
| **Search/Filter** | URL Params            | ✅ Yes     | `?q=laptop&sort=price_asc`       |
| **Pagination**    | URL Params            | ✅ Yes     | `?page=3`                        |
| **Tabs/Modals**   | URL Params (Optional) | ✅ Yes     | `?tab=specs` or `?modal=login`   |
| **Form Input**    | Local `useState`      | ❌ No      | Uncommitted text in a name field |
| **UI Toggles**    | Local `useState`      | ❌ No      | "Show more" dropdown state       |
| **Global UI**     | Context / Zustand     | ❌ No      | Theme (Dark/Light), Sidebar open |

## Anti-Patterns

- **Duplicate State**: Storing the same value in both a `useState` variable and the URL. Synchronize them instead.
- **Missing `Suspense`**: Not wrapping components that use `useSearchParams` in `<Suspense>`, which can lead to client-side de-optimization.
- **Hard-coded URL Strings**: Building URLs with string concatenation. Always use `URLSearchParams` to ensure valid encoding.
- **Unnecessary `router.push`**: Using `push` (adding to history) when `replace` (updating current entry) would be more appropriate for filter changes.

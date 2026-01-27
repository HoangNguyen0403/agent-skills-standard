# Next.js Suspense Bailout Rules

Certain hooks cause an "Opt-out" of Static Generation, forcing a CSR (Client-Side Rendering) bailout for the entire page if not wrapped in a `<Suspense>` boundary.

## **1. useSearchParams()**

Always requires a Suspense boundary in static routes.

```tsx
// Bad: Entire page becomes CSR
'use client'
import { useSearchParams } from 'next/navigation'
function SearchBar() { ... }

// Good: Wrap the component
import { Suspense } from 'react'
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchBar />
    </Suspense>
  )
}
```

## **2. usePathname()**

Requires a Suspense boundary when used in dynamic routes (`[slug]`), unless `generateStaticParams` is used.

## **Quick Reference**

| Hook                | Suspense Required?       |
| ------------------- | ------------------------ |
| `useSearchParams()` | **YES** (Static routes)  |
| `usePathname()`     | **YES** (Dynamic routes) |
| `useParams()`       | NO                       |
| `useRouter()`       | NO                       |

In the App Router, a page can usually be an async Server Component and fetch its data on the server:

```tsx
export default async function Page() {
  const response = await fetch('https://example.test/api/items', {
    next: { revalidate: 300 },
  });
  const items = await response.json();
  return <ItemList items={items} />;
}
```

Move reusable queries into a server-only data/access module and keep `page.tsx` focused on composition. Remove `useEffect` for initial data that can be rendered on the server; use `loading.tsx` or Suspense for pending UI. Add `'use client'` only to the smallest interactive component that needs state, event handlers, or browser APIs. A Client Component should fetch through a Route Handler or a client data library only when the data is inherently client-side, frequently refreshed, or driven by client interaction. Make caching explicit (`cache`, `next.revalidate`, tags, or `no-store`) and avoid waterfalls with parallel requests.


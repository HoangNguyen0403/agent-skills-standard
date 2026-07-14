Make the Server Component `async` and fetch before rendering. Server Components can call internal services or a remote API without exposing credentials to the browser:

```tsx
export default async function ProductsPage() {
  const response = await fetch('https://example.test/products', {
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error('Failed to load products');
  const products: Product[] = await response.json();
  return <ProductList products={products} />;
}
```

Use a server-only data-access module for database queries, and keep authorization there. Choose caching explicitly: `next.revalidate` for time-based freshness, tags for targeted invalidation, or `cache: 'no-store'` for request-fresh/personalized data. Use `loading.tsx` or Suspense for pending UI and an error boundary for failures. Do not add `useEffect` merely to load initial page data; add a Client Component and a browser-side data library only when the data needs client-driven refresh or interaction.


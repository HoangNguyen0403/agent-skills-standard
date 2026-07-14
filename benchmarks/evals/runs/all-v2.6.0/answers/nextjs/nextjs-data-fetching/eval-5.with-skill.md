Call the database or service layer directly from the async Server Component; do not make an HTTP request to the application’s own `/api` route:

```tsx
export default async function Page() {
  const products = await productService.list()
  return <ProductList products={products} />
}
```

Prefer a server-only DAL that authenticates, authorizes, returns DTOs, and applies caching policy. Use an internal Route Handler only when an actual HTTP boundary is required by a client or external consumer.


Yes. A Server Component can call a database directly because it executes on the server:

```tsx
import 'server-only';

export default async function Page() {
  const rows = await db.product.findMany({
    where: { published: true },
    select: { id: true, name: true, price: true },
  });
  return <ProductList products={rows} />;
}
```

Prefer putting the query in a small server-only DAL rather than embedding it in every page. Authenticate and authorize at that boundary, select only required fields, map ORM objects to serializable DTOs, and keep connection management/environment variables server-only. Do not import this module from a Client Component or pass the DB client through props. Choose caching explicitly: request memoization/deduplication where appropriate, durable cache with safe keys/tags for public data, and no-store for personalized or freshness-critical queries. Use a Route Handler or Server Action when a browser must initiate a read/mutation after hydration.


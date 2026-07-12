Yes. A Server Component is an appropriate place to read a database because its code runs on the server:

```tsx
import { getProduct } from '@/server/products';

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  return <ProductView product={product} />;
}
```

Keep the query in a `server-only` data-access module, use a connection strategy suitable for the deployment runtime, select/map only required fields, and authenticate/authorize before returning data. Do not import the module into a Client Component, pass the ORM client through props, or serialize secrets/raw model objects. Make caching explicit and safe for the user/tenant: public stable data may be cached/revalidated, while personalized data should be request-fresh or keyed by identity. Use a Route Handler or Server Action when a browser needs to initiate a later request or mutation.


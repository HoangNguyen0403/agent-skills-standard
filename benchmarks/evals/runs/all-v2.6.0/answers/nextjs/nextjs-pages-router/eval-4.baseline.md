Create `pages/products/[id].tsx`; the bracket segment becomes `router.query.id` at runtime and `params.id` during static generation:

```tsx
export async function getStaticPaths() {
  const products = await loadProductIds();
  return {
    paths: products.map(({ id }) => ({ params: { id } })),
    fallback: 'blocking',
  };
}

export async function getStaticProps({ params }) {
  const product = await loadProduct(params!.id as string);
  if (!product) return { notFound: true };
  return { props: { product }, revalidate: 300 };
}

export default function Product({ product }) {
  return <h1>{product.name}</h1>;
}
```

Use `fallback: false` when only listed paths should exist, `true` when you render a fallback state, or `'blocking'` when the first request should wait for generated HTML without a client loading state. Validate the ID and authorize access in the data layer; do not treat the URL parameter as trusted input.


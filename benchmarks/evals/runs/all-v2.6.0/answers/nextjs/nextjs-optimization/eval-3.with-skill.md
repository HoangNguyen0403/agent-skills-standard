Export static metadata for fixed page values or `generateMetadata` when metadata depends on route/data:

```ts
export const metadata = {
  title: 'Products',
  description: 'Browse our products',
  openGraph: { title: 'Products', images: ['/og/products.png'] },
}
```

Keep metadata in `layout.tsx`/`page.tsx` or `generateMetadata`, not `_document.tsx`. Add canonical and locale metadata where applicable, and ensure each page has a meaningful title, description, and Open Graph image.


Create `pages/[id].tsx` and read the route parameter in `getServerSideProps` or `getStaticProps`:

```tsx
export async function getServerSideProps({ params }) {
  const item = await getItem(String(params?.id))
  if (!item) return { notFound: true }
  return { props: { item } }
}
```

Type the props with the appropriate Next.js helper. Use `[...slug].tsx` for catch-all segments and keep API endpoints under `pages/api/`.


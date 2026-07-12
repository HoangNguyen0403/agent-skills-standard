In `pages/`, export `getServerSideProps` as a standalone async function and return serializable props:

```tsx
export async function getServerSideProps() {
  const posts = await postService.list()
  return { props: { posts } }
}
```

Use `InferGetServerSidePropsType` for the page props. Call the service or database directly; do not fetch the app’s own API route from `getServerSideProps`.


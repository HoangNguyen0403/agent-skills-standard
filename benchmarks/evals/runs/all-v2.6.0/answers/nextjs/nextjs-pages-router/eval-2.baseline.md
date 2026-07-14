Pages Router page components should not be made `async` merely to fetch initial data. Fetch on the server with `getServerSideProps` or `getStaticProps`, then render the returned props:

```tsx
export async function getServerSideProps() {
  const data = await loadData();
  return { props: { data } };
}

export default function Page({ data }: { data: Data }) {
  return <View data={data} />;
}
```

If the data is client-only or must refresh after hydration, keep the page component synchronous, add the appropriate client hook, and handle loading/error states—or use SWR/React Query. A component can use event handlers and hooks normally in the Pages Router; the App Router's Server/Client Component boundary rules do not apply in the same way. Check that the actual failure is not an `async` component returning a Promise to a client renderer, and keep props serializable.


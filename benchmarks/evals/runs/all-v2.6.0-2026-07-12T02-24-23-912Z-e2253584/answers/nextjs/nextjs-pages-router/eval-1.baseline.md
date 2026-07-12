In the Pages Router, export `getServerSideProps` from the page. It runs on every request on the server and passes serializable props to the page component:

```tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const response = await fetch('https://example.test/dashboard');
  if (!response.ok) return { notFound: true };
  const data = await response.json();
  return { props: { data } };
};

export default function Dashboard(
  { data }: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return <pre>{JSON.stringify(data)}</pre>;
}
```

Read cookies/headers from `context.req`, authenticate and authorize on the server, and return only safe JSON-serializable values. Use `redirect` for unauthenticated users and `notFound` for missing resources. Do not put `getServerSideProps` in `_app` or call it from a Client Component; it is a page-level data-fetching export.


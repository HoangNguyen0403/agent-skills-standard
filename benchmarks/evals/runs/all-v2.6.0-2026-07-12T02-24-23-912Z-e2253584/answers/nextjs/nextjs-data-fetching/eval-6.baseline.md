Use Server Components for initial page data, SEO-visible content, server-side authorization, and data that can be rendered as part of the route. The server can fetch directly and stream the result without shipping the query code or credentials to the browser.

Use SWR when the browser needs client-owned behavior such as polling, focus revalidation, optimistic updates, infinite scrolling, or interaction-driven requests after hydration. Expose an authenticated Route Handler (or use a Server Action for mutations), and seed SWR with server-rendered initial data to avoid a duplicate loading request:

```tsx
<ClientPanel initialData={data} />
```

Do not use SWR just to fetch static initial content, and do not move authorization-sensitive database access into the client. A common hybrid is Server Component for the first render plus SWR for subsequent refreshes, with server cache invalidation after mutations and an explicit policy for errors, stale data, and cache keys.


Do not import the database client or a server-only DAL into a Client Component. Fetch on the server and pass a safe, serializable DTO as props:

```tsx
// Server Component
const user = await getUserSummary(userId);
return <UserPanel user={user} />;
```

If the client needs to refresh or mutate the data independently, expose a narrowly scoped authenticated Route Handler or use a Server Action for mutations, then call it from a client data library such as SWR/React Query. The endpoint/action must authenticate the session, authorize the resource, validate inputs, and return only an allowlisted DTO. Never send database credentials, raw ORM objects, private fields, or an unrestricted query endpoint to the browser. For initial data plus client refresh, render the server-fetched DTO as the cache's initial value so the page does not duplicate the first request.


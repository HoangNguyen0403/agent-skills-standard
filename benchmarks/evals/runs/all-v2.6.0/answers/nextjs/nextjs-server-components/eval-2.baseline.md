Render the Server Component from a Server Component parent and pass it through the Client Component's `children` slot:

```tsx
// Server parent
export default async function Page() {
  const data = await getData();
  return (
    <InteractiveShell>
      <ServerResults data={data} />
    </InteractiveShell>
  );
}
```

```tsx
// InteractiveShell.tsx
'use client';
export function InteractiveShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return open ? <section>{children}</section> : null;
}
```

The Client Component does not import `ServerResults`; it receives the rendered React Server Component payload as a slot/serializable RSC reference. The server component remains server-rendered and can keep its data access server-side. Keep props crossing the boundary serializable and avoid passing callbacks from server to client; put interactivity in the client shell and mutations in a Server Action.


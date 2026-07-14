Server Components cannot use `useState` because they are rendered on the server and do not own persistent browser state or event handlers. Move the interactive part into a small Client Component:

```tsx
// Server Component
export default async function Page() {
  const initial = await getItems();
  return <FilterableList initialItems={initial} />;
}
```

```tsx
'use client';
function FilterableList({ initialItems }) {
  const [filter, setFilter] = useState('');
  return <… />;
}
```

Keep data fetching and authorization on the server, pass serializable initial data, and use Server Actions/Route Handlers for mutations. If the apparent state is just URL/search state, use route params/search params; if it is purely presentation, use CSS or derived values instead of state. Do not add `'use client'` to a large page just to make one button work—split the boundary at the interactive leaf.


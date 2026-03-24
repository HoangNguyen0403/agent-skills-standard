# References

Move large code blocks here.

## Inline Examples

```typescript
// app/dashboard/page.tsx (Server Component)
import { ClientTabs } from './client-tabs';
export default async function Dashboard() {
  const data = await db.metrics.findMany();
  return (
    <ClientTabs>
      <MetricsTable data={data} /> {/* Server Component passed as children */}
    </ClientTabs>
  );
}

// app/dashboard/client-tabs.tsx
'use client';
export function ClientTabs({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState(0);
  return <div>{tab === 0 ? children : <Settings />}</div>;
}
```

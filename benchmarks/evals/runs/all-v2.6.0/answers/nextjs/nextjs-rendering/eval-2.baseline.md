Stream the slow portion instead of making the entire route wait. Keep the page a Server Component, start independent requests in parallel, and wrap the slow dashboard panel in Suspense with a fallback:

```tsx
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <main>
      <Header />
      <Suspense fallback={<DashboardSkeleton />}>
        <SlowMetrics />
      </Suspense>
    </main>
  );
}

async function SlowMetrics() {
  const metrics = await getMetrics();
  return <Metrics data={metrics} />;
}
```

Add `loading.tsx` for the route-level fallback, but use nested boundaries so fast content can render first. Parallelize unrelated queries and cache data when its freshness allows. If the 3-second call is inherently slow, optimize or paginate it and provide an error/retry boundary; do not hide an authorization or reliability problem by making everything client-side.


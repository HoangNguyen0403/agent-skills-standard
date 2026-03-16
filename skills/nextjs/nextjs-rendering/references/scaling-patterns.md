# Scaling Patterns for Next.js Rendering

## 1. The "Static Shell" Pattern (Recommended)

### Goal

Maximize CDN cache hits by making the page structure static while streaming dynamic content.

### Pattern

**Static Parts** (rendered at build/ISR time):

- Layout/Shell (Logo, Navigation, Footer)
- Page structure and styling
- Common UI elements

**Dynamic Parts** (streamed at request time):

- User-specific data (Profile, Cart Count)
- Personalized recommendations
- Real-time data (Stock prices, notifications)

### Implementation

```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div>
      {/* Static shell - cached at CDN */}
      <header>
        <Logo />
        <Navigation />
      </header>

      <main>
        {/* Dynamic holes - streamed */}
        <Suspense fallback={<ProfileSkeleton />}>
          <UserProfile />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <LiveChart />
        </Suspense>
      </main>

      {/* Static footer */}
      <Footer />
    </div>
  );
}
```

### Result

- **TTFB (Time to First Byte)**: ~50ms (static shell from CDN)
- **Perceived Performance**: Instant, even with slow database
- **User Experience**: Progressive loading with skeletons
- **Scaling**: Minimal server load, CDN handles traffic

---

## 2. Avoiding "SSR Waterfalls"

### Problem: Sequential Blocking

In naive SSR implementations, the server waits for **every** data fetch to complete before sending **any** HTML to the browser.

**Example Scenario**:

```bash
Database Call:     200ms
Auth Check:        100ms
3rd Party API:     500ms
------------------------
Total Blocking:    800ms ← Blank screen!
```

### Anti-Pattern: Root-Level Sequential Awaits

```tsx
// ❌ BAD: All fetches block initial HTML
export default async function Page() {
  const user = await fetchUser(); // 200ms
  const permissions = await checkAuth(); // 100ms
  const data = await fetchExternal(); // 500ms

  // User sees nothing for 800ms!
  return <Dashboard user={user} permissions={permissions} data={data} />;
}
```

### Solution: Push Fetches Down + Suspense

```tsx
// ✅ GOOD: Instant shell, progressive content
export default function Page() {
  return (
    <div>
      {/* Shell renders immediately */}
      <Header />

      <Suspense fallback={<Skeleton />}>
        <UserSection /> {/* Fetches user internally */}
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <DataSection /> {/* Fetches data internally */}
      </Suspense>
    </div>
  );
}

// UserSection.tsx
async function UserSection() {
  const user = await fetchUser(); // Parallel with DataSection
  return <Profile user={user} />;
}
```

### Benefits

- **Parallel Fetching**: All data fetches happen simultaneously
- **Progressive Rendering**: Shell appears in ~50ms
- **Better UX**: User sees structure immediately, not a blank screen
- **Lower Abandonment**: Faster perceived load time

---

## 3. Combining Strategies

### Hybrid Approach: ISR + Streaming

```tsx
// app/product/[id]/page.tsx

// ISR: Revalidate every hour
export const revalidate = 3600;

export default function ProductPage({ params }) {
  return (
    <div>
      {/* Static/ISR parts */}
      <ProductImages id={params.id} />
      <ProductDescription id={params.id} />

      {/* Real-time parts */}
      <Suspense fallback={<StockSkeleton />}>
        <LiveStockInfo id={params.id} />
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <RecentReviews id={params.id} />
      </Suspense>
    </div>
  );
}
```

**Result**:

- Product info cached for 1 hour (ISR)
- Stock and reviews always fresh (Streaming)
- Fast TTFB + accurate data

---

## Performance Metrics

| Pattern         | TTFB  | FCP   | LCP   | Server Cost |
| :-------------- | :---- | :---- | :---- | :---------- |
| All SSR (Naive) | 800ms | 850ms | 900ms | High        |
| Static Shell    | 50ms  | 100ms | 400ms | Low         |
| ISR + Streaming | 50ms  | 100ms | 350ms | Medium      |

**Legend**:

- TTFB: Time to First Byte
- FCP: First Contentful Paint
- LCP: Largest Contentful Paint

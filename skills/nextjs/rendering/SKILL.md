---
name: Next.js Rendering Strategies
description: SSG, SSR, ISR, Streaming, and Partial Prerendering (PPR).
metadata:
  labels: [nextjs, rendering, isr, ssr, ssg]
  triggers:
    files: ['**/page.tsx', '**/layout.tsx']
    keywords: [generateStaticParams, dynamic, dynamicParams, PPR, streaming]
---

# Rendering Strategies (App Router)

## **Priority: P0 (CRITICAL)**

Understanding how Next.js renders content determines performance and cost.

## Strategy Selection Matrix (Scaling & Cost)

| Strategy | Ideal For              | Data Freshness       | Performance (TTFB)          | Scaling Risk                         |
| :------- | :--------------------- | :------------------- | :-------------------------- | :----------------------------------- |
| **SSG**  | Marketing, Docs, Blogs | Build Time           | **Instant** (CDN)           | **None**                             |
| **ISR**  | E-commerce, CMS        | Periodic (e.g., 60s) | **Instant** (CDN)           | **Low** (Background Rebuilds)        |
| **SSR**  | Dashboards, Auth Gates | Real-Time (Request)  | **Slow** (Waits for Server) | **Critical** (1 Request = 1 Compute) |
| **PPR**  | Personalized Apps      | Hybrid               | **Instant** (Shell)         | **Medium** (Streaming Holes)         |

## Scaling Patterns

### 1. The "Static Shell" Pattern (Preferred)

- **Goal**: Make most of the page **Static** to hit the CDN cache.
- **Pattern**:
  - Render the generic layout (Logo, Footer, Navigation) as **Static**.
  - Wrap personalized/slow components (User Profile, Cart Count, Recommendations) in `<Suspense>`.
- **Result**: **TTFB (Time to First Byte)** is near-instant (~50ms) because the shell is cached. User perception is fast, even if DB is slow.

### 2. Avoiding "SSR Waterfalls"

- **Problem**: In naive SSR, the server waits for _every_ fetch to finish before sending _any_ HTML.
  - _Scenario_: DB Call (200ms) + Auth Check (100ms) + 3rd Party API (500ms) = Blank screen for 800ms.
- **Solution**:
  - Move slow fetches **down** the component tree into Suspense boundaries.
  - Do not `await` everything in the root `page.tsx`.

## 1. Static Rendering (SSG) - **Default**

- **Behavior**: Routes are rendered at **build time**.
- **Usage**: Marketing pages, Blogs, Documentation.
- **Dynamic Routes**: Use `generateStaticParams` to generate static pages for dynamic paths (e.g., `/blog/[slug]`).

  ```tsx
  export async function generateStaticParams() {
    const posts = await getPosts();
    return posts.map((post) => ({ slug: post.slug }));
  }
  ```

## 2. Dynamic Rendering (SSR)

- **Behavior**: Routes are rendered at **request time**.
- **Triggers**:
  - Using Dynamic Functions: `cookies()`, `headers()`, `searchParams`.
  - Using Dynamic Fetch: `fetch(..., { cache: 'no-store' })`.
  - Explicit Config: `export const dynamic = 'force-dynamic'`.

## 3. Streaming (Suspense)

- **Problem**: SSR blocks the entire page until all data is ready.
- **Solution**: Wrap slow components in `<Suspense>`. Next.js instantly sends the initial HTML (static shell) and streams the slow content later.

  ```tsx
  <Suspense fallback={<Skeleton />}>
    <SlowDashboard />
  </Suspense>
  ```

## 4. Incremental Static Regeneration (ISR)

- **Behavior**: Update static content after build time without rebuilding the entire site.
- **Time-based**: `export const revalidate = 3600;` (in layout/page) or `{ next: { revalidate: 3600 } }` (in fetch).
- **On-Demand**: `revalidatePath('/posts')` via Server Actions or Webhooks.

## 5. Partial Prerendering (PPR) - _Experimental_

- **Concept**: Combines Static shell + Dynamic holes.
- **Config**: `export const experimental_ppr = true`.
- **Behavior**: The build generates a static shell for the route (served instantly from Edge), and dynamic parts stream in.

## Runtime Configuration

- **Node.js (Default)**: Full Node.js API support.
- **Edge**: `export const runtime = 'edge'`. Limited API, starts instantly, lower cost.

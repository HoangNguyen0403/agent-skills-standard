# Next.js Rendering Implementation Details

## Static Rendering (SSG)

- **Behavior**: Rendered at build time.
- **Use**: Marketing, blogs, docs.
- **Dynamic Routes**: Use `generateStaticParams` for pre-rendering specific paths.

## Dynamic Rendering (SSR)

- **Behavior**: Rendered per request.
- **Triggers**:
  - `cookies()`, `headers()`, `searchParams`
  - `fetch(..., { cache: 'no-store' })`
  - `export const dynamic = 'force-dynamic'`

## Streaming (Suspense)

- **Problem**: SSR blocks the entire page until data is ready.
- **Solution**: Wrap slow components in `<Suspense>` to stream parts of the page progressively.

## Incremental Static Regeneration (ISR)

- **Behavior**: Update static content post-build without a full rebuild.
- **Time-based**: `export const revalidate = 3600;`
- **On-Demand**: `revalidatePath('/posts')` via Server Actions or Webhooks.

## Partial Prerendering (PPR)

- **Behavior**: Static shell with dynamic "holes" filled at runtime.
- **Config**: `ppr: 'incremental'` in `next.config.ts`.

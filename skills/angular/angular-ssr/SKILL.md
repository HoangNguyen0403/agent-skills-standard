---
name: angular-ssr
description: Implement Angular SSR with hydration, TransferState caching, and per-route render modes. Use when configuring Angular Universal SSR, client hydration, static prerendering, or preventing double-fetching.
metadata:
  triggers:
    files:
    - '**/*.server.ts'
    - 'server.ts'
    keywords:
    - hydration
    - transferState
    - afterNextRender
    - isPlatformServer
    - RenderMode
---
# SSR (Server-Side Rendering)

## **Priority: P2 (MEDIUM)**

## 1. Enable Hydration

- Run `ng add @angular/ssr`.
- Add `provideClientHydration(withEventReplay())` to `app.config.ts` providers.

See [hydration examples](references/hydration.md) for app config and hydration setup.

## 2. Guard Browser-Only Code

- Use `afterNextRender(() => { /* window access */ })` for one-time browser-only code.
- For recurring checks, inject `PLATFORM_ID` and use `isPlatformBrowser(platformId)`.

## 3. Prevent Double-Fetching

- Use `withHttpTransferCacheOptions()` or manual `TransferState` to cache server responses for client replay.

## 4. Configure Render Modes (Angular 17+)

Export `ServerRoute[]` in `app.routes.server.ts`:

- **RenderMode.Prerender** — Static HTML at build time (blogs, marketing).
- **RenderMode.Server** — Dynamic SSR per request (user-specific pages).
- **RenderMode.Client** — Client-only SPA (authenticated dashboards).

## 5. Incremental Hydration (Angular 19+)

- Defer hydration with `@defer (hydrate on viewport)`.
- Triggers: `viewport`, `interaction`, `idle`, `timer(ms)`, `immediate`, `never`.
- Add `withEventReplay()` to capture user events before hydration completes.

## Anti-Patterns

- **No direct window/document access**: Use `afterNextRender()` or `PLATFORM_ID` check.
- **No double-fetching**: Use `withHttpTransferCacheOptions()` or `TransferState`.
- **No SSR for auth-gated pages**: Set `RenderMode.Client` for authenticated dashboards.

## References

- [Hydration](references/hydration.md)
---
name: angular-ssr
description: 'Hydration, TransferState, and Prerendering standards. Use when implementing Angular Universal SSR, hydration, or static prerendering. (triggers: **/*.server.ts, server.ts, hydration, transferState, afterNextRender, isPlatformServer, RenderMode)'
---

# SSR (Server-Side Rendering)

## **Priority: P2 (MEDIUM)**

## Principles

- **Hydration**: Run **ng add @angular/ssr**. In `app.config.ts` add **provideClientHydration(withEventReplay())** to providers. This enables **full app hydration** where Angular reuses server-rendered DOM instead of wiping and re-rendering on the client.
- **Platform Checks**: Use **afterNextRender(() => { /_ window access _/ })** or `afterRender` for browser-only code (e.g., accessing **window**, **document**, or **localStorage**). For recurring access, inject **PLATFORM_ID** and check **isPlatformBrowser(platformId)**.
- **TransferState**: Use **withHttpTransferCacheOptions()** or manual **TransferState** service to **prevent double-fetching** by caching server responses for client replay.

## Render Modes (Angular 17+)

Configure per-route via **app.routes.server.ts** by exporting **ServerRoute[]**:

- **RenderMode.Prerender** — Static HTML at build time (blogs, marketing)
- **RenderMode.Server** — Dynamic SSR per request (user-specific pages)
- **RenderMode.Client** — Client-only SPA (authenticated dashboards)

## Incremental Hydration (Angular 19+)

Defer hydration of heavy components using **@defer (hydrate on viewport)**:

- Triggers: `viewport`, `interaction`, `idle`, `timer(ms)`, `immediate`, `never`
- Add **withEventReplay()** to `provideClientHydration()` to capture user events before hydration completes.

## Guidelines

- **Browser Objects**: **Never access window** directly in component logic. Implement abstractions or use `afterNextRender`.
- **Prerendering**: Use `getPrerenderParams()` in server routes to enumerate dynamic slugs.

## Anti-Patterns

- **No direct window/document access**: Use `afterNextRender()` or `PLATFORM_ID` check for browser APIs.
- **No double-fetching**: Use `withHttpTransferCacheOptions()` or `TransferState` to avoid re-fetching on client.
- **No SSR for auth-gated pages**: Set `RenderMode.Client` for authenticated dashboards.

## References

- [Hydration](references/hydration.md)

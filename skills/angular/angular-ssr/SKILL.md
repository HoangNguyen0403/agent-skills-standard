---
name: angular-ssr
description: "Hydration, TransferState, and Prerendering standards. Use when implementing Angular Universal SSR, hydration, or static prerendering. (triggers: **/*.server.ts, server.ts, hydration, transferState, afterNextRender, isPlatformServer, RenderMode)"
---

# SSR (Server-Side Rendering)

## **Priority: P2 (MEDIUM)**

## Principles

- **Hydration**: Enable Client Hydration in `app.config.ts`.
- **Platform Checks**: Use `afterNextRender` or `afterRender` for browser-only code (e.g., accessing `window`).
- **TransferState**: Use `withHttpTransferCacheOptions()` or manual `TransferState` to prevent double-fetching.

## Render Modes (Angular 17+)

Configure per-route via `app.routes.server.ts`:
- `RenderMode.Prerender` — Static HTML at build time (blogs, marketing)
- `RenderMode.Server` — Dynamic SSR per request (user-specific pages)
- `RenderMode.Client` — Client-only SPA (authenticated dashboards)

## Incremental Hydration (Angular 19+)

Defer hydration of heavy components using `@defer (hydrate on viewport)`:
- Triggers: `viewport`, `interaction`, `idle`, `timer(ms)`, `immediate`, `never`
- Add `withEventReplay()` to `provideClientHydration()` to capture early user events.

## Guidelines

- **Browser Objects**: Never access `window`, `document`, or `localStorage` directly in component logic. Implement abstractions or use `afterNextRender`.
- **Prerendering**: Use `getPrerenderParams()` in server routes to enumerate dynamic slugs.

## Anti-Patterns

- **No direct window/document access**: Use `afterNextRender()` or `PLATFORM_ID` check for browser APIs.
- **No double-fetching**: Use `withHttpTransferCacheOptions()` or `TransferState` to avoid re-fetching on client.
- **No SSR for auth-gated pages**: Set `RenderMode.Client` for authenticated dashboards.

## References

- [Hydration](references/hydration.md)

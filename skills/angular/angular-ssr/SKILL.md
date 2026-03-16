---
name: angular-ssr
description: "Hydration, TransferState, and Prerendering standards. Use when implementing Angular Universal SSR, hydration, or static prerendering. (triggers: **/*.server.ts, server.ts, hydration, transferState, afterNextRender, isPlatformServer)"
---

# SSR (Server-Side Rendering)

## **Priority: P2 (MEDIUM)**

## Principles

- **Hydration**: Enable Client Hydration in `app.config.ts`.
- **Platform Checks**: Use `afterNextRender` or `afterRender` for browser-only code (e.g., accessing `window`).
- **TransferState**: Use `makeStateKey` and `TransferState` to prevent double-fetching data on client.

## Guidelines

- **Browser Objects**: Never access `window`, `document`, or `localStorage` directly in component logic. Implement abstractions or use `afterNextRender`.
- **Prerendering**: Use SSG for static pages (Marketing, Blogs).

## References

- [Hydration](references/hydration.md)


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.

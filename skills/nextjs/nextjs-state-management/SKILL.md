---
name: nextjs-state-management
description: "Apply best practices for managing URL, server, and client state in Next.js applications. Use when choosing between URL params, SWR/TanStack Query, Zustand, or Context for state, or when fixing hydration mismatches from localStorage. (triggers: **/hooks/*.ts, **/store.ts, **/components/*.tsx, useState, useContext, zustand, redux)"
---

# State Management

## **Priority: P2 (MEDIUM)**

## Decision Guide

1. **Shareable/persistent?** Use URL state (`useSearchParams` + `useRouter`).
2. **Server data?** Use SWR or TanStack Query. Never sync into `useState`.
3. **Complex client UI?** Use Zustand (in `'use client'` only) or Jotai.
4. **Simple local?** Use `useState`. Colocate as close to consumer as possible.

## URL-Driven State

See [implementation examples](references/implementation.md)

## Server State (SWR / TanStack Query)

See [implementation examples](references/implementation.md)

## Client State (Zustand)

See [implementation examples](references/implementation.md)

## Hydration Safety

Wrap `localStorage` reads in `useEffect` or a `mounted` flag to avoid hydration mismatches. Manage optimistic updates with `useOptimistic` in Next.js 15+.

## Library Patterns

- [references/redux.md](references/redux.md)
- [references/zustand.md](references/zustand.md)
- [references/url-state.md](references/url-state.md)

## Anti-Patterns

- **No global store for simple state**: Use `useState` or URL params; avoid Zustand for basic UI.
- **No large objects in state**: Decompose into granular primitives to prevent extra re-renders.
- **No `useEffect` for data fetching**: Use SWR or TanStack Query for server state.
- **No server state in client stores**: Fetch in RSCs; client stores are for UI-only state.

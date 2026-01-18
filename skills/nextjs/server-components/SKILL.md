---
name: Next.js Server Components
description: RSC usage, "use client" directive, and Component Purity.
metadata:
  labels: [nextjs, rsc, components]
  triggers:
    files: ['**/*.tsx', '**/*.jsx']
    keywords: [use client, Server Component, Client Component, hydration]
---

# Server & Client Components

## **Priority: P0 (CRITICAL)**

Next.js (App Router) uses React Server Components (RSC) by default.

## Server Components (Default)

- **Behavior**: Rendered on server, sent as HTML/Payload to client. Zero bundle size for included libs.
- **Capabilities**: Async/Await, Direct DB access, Secrets usage.
- **Restrictions**: No `useState`, `useEffect`, or Browser APIs (`window`, `localstorage`).

## Client Components

- **Directive**: Add `'use client'` at the VERY TOP of the file.
- **Usage**: Interactivity (`onClick`), State (`useState`), Lifecycle effects, Browser APIs.
- **Strategy**: Move Client Components to the leaves of the tree.
  - _Bad_: Making the root layout a Client Component.
  - _Good_: Wrapping a `<Button />` in a Client Component.

## Composition Patterns

- **Server-in-Client**: You cannot import a Server Component directly into a Client Component.
  - _Fix_: Pass Server Component as `children` prop to the Client Component.

```tsx
// ClientWrapper.tsx
'use client';
export default function ClientWrapper({ children }) {
  return <div>{children}</div>;
}

// Page.tsx (Server)
<ClientWrapper>
  <ServerComponent />
</ClientWrapper>;
```

## Anti-Patterns

- **Poisoning**: Importing server-only secrets into Client Components (Use `server-only` package to prevent).
- **Over-fetching**: Passing large data props to Client Components (Serialization cost). Only pass IDs if possible.

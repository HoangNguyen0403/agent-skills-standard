---
name: React Performance
description: Optimization strategies for React applications (Client & Server).
metadata:
  labels: [react, performance, optimization, nextjs]
  triggers:
    files: ['**/*.tsx', '**/*.jsx']
    keywords: [waterfall, bundle, lazy, suspense, dynamic]
---

# React Performance

## **Priority: P0 (CRITICAL)**

Strategies to minimize waterfalls, bundle size, and render cost.

## Elimination of Waterfalls (P0)

- **Parallel Data**: Use `Promise.all` for independent fetches. Avoid sequential `await`.
- **Preload**: Start fetches before render (in event handlers or route loaders).
- **Suspense**: Use Suspense boundaries to stream partial content.

## Bundle Optimization (P0)

- **No Barrel Files**: Import directly `import { Btn } from './Btn'` vs `import { Btn } from './components'`.
- **Lazy Load**: `React.lazy` / `next/dynamic` for heavy components (Charts, Modals).
- **Defer**: Load 3rd-party scripts (Analytics) after hydration.

## Rendering & Re-renders (P1)

- **Isolation**: Move state down. Isolate heavy UI updates.
- **Context Splitting**: Split Context into `StateContext` (Data) and `DispatchContext` (Actions) to prevent consumers from re-rendering just because they need a setter.
- **Stability**: Use `useMemo` for passing objects/arrays to children to preserve referential equality checks (`React.memo`).
- **Virtualization**: `react-window` for lists > 50 items.
- **Content Visibility**: `content-visibility: auto` for off-screen CSS content.
- **Static Hoisting**: Extract static objects/JSX outside component scope.
- **Transitions**: `startTransition` for non-urgent UI updates.

## Parallelization (P1)

- **Web Workers**: Move heavy computation (Encryption, Image processing, Large Data Sorting) off the main thread using `Comlink` or `Worker`.

## Server Performance (RSC) (P1)

- **Caching**: `React.cache` for per-request deduplication.
- **Serialization**: Minimize props passing to Client Components (only IDs/primitives).

## Anti-Patterns

- **No `export *`**: Breaks tree-shaking.
- **No Sequential Await**: Causes waterfalls.
- **No Inline Objects**: `style={{}}` breaks strict equality checks (if memoized).
- **No Heavy Libs**: Avoid moment/lodash (use dayjs/radash).

## Code

```tsx
// Parallel Fetching (Good)
const [user, posts] = await Promise.all([getUser(), getPosts()]);

// Bundle Optimized Import (Good)
import { Button } from './components/Button'; // Not from './components'

// Static Hoist (Good)
const STATIC_CONFIG = { theme: 'dark' };
function Component() {
  return <div config={STATIC_CONFIG} />;
}
```

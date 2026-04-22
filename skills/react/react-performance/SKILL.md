---
name: react-performance
description: Optimize React rendering, bundle size, and data fetching performance. Use when optimizing React rendering performance, reducing re-renders, or improving bundle size.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    - '**/*.jsx'
    keywords:
    - waterfall
    - bundle
    - lazy
    - suspense
    - dynamic
---
# React Performance

## **Priority: P0 (CRITICAL)**


## Eliminate Data Waterfalls (P0)

- **Parallel Data**: Use **`Promise.all([getUser(), getProducts(), ...])`** for independent fetches. Avoid **sequential awaits** (Request Waterfalls).
- **Preload**: Start fetches before render (in event handlers or **route loaders**).
- **Suspense**: Use **Suspense boundaries** to stream partial content and show partial content early.

See [implementation examples](references/REFERENCE.md#parallel-fetch-with-suspense) for parallel fetch with Suspense boundary and lazy loading patterns.

## Reduce Bundle Size (P0)

- **No Barrel Files**: **Avoid barrel files** (importing from index.ts); import directly from component files to improve tree-shaking.
- **Lazy Load**: Use **`React.lazy`** or **`next/dynamic`** for heavy components like **Charts**, **Modals**, or large libraries.
- **Dependency Reduction**: **Replace moment with dayjs** or **lodash with native/radash** to drop bytes. Use **`source-map-explorer`** or **`bundle-visualizer`** to find bloat.

## Minimize Re-renders (P1)

- **Isolation**: Move state as close to its usage as possible. Isolate heavy UI updates.
- **List Performance**: Use **`react-window`** or **`react-virtual`** for **virtualization** of lists with 500+ items. Wrap list items in **`React.memo`**.
- **Context Splitting**: **Split Context** into `State` and `Dispatch` objects. This prevents all consumers from re-rendering when only setter needed.
- **Stability**: Use **`useMemo` for derived list data** and passing stable object/array references to children.
- **Content Visibility**: `content-visibility: auto` for off-screen CSS content.
- **Static Hoisting**: Extract static objects/JSX outside component scope.
- **Transitions**: `startTransition` for non-urgent UI updates.

## Parallelize Computation (P1)

- **Web Workers**: Move heavy computation (Encryption, Image processing, Large Data Sorting) off main thread using `Comlink` or `Worker`.

## Optimize Server Components (RSC) (P1)

- **Caching**: `React.cache` for per-request deduplication.
- **Serialization**: Minimize props passing to Client Components (only IDs/primitives).

## Anti-Patterns

- **No `export *`**: Breaks tree-shaking.
- **No Sequential Await**: Causes waterfalls.
- **No Inline Objects**: `style={{}}` breaks strict equality checks (if memoized).
- **No Heavy Libs**: Avoid moment/lodash (use dayjs/radash).

## References

See [references/REFERENCE.md](references/REFERENCE.md) for Profiler usage, bundle analysis, Web Workers, and debounce patterns.
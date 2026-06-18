---
name: react-performance
description: Optimize React rendering, bundle size, and data flow with profiler-led decisions. Use when reducing re-renders, fixing waterfalls, or deciding whether memoization is warranted in React.
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

## Decision Map

- **Measure first**: use React DevTools Profiler or app-level traces before adding memoization.
- **Waterfalls**: parallelize independent reads with `Promise.all` and stream slow branches behind `Suspense`.
- **Rerenders**: move state down, split context, and memoize only measured hot paths.
- **Bundle cost**: lazy-load heavy islands, remove oversized dependencies, and avoid barrel files that fight tree-shaking.
- **Compiler-aware**: if React Compiler is enabled, do not scatter `useCallback`/`useMemo` by reflex.

## Recipe

1. **Find the hotspot**: profiler flamegraph, bundle analyzer, or waterfall trace.
2. **Pick the narrow fix**: state placement, context split, transition, lazy load, or memoization.
3. **Retest after change**: confirm the render count or blocking time actually improved.
4. **Keep slow work off the main path**: workers for heavy compute, streaming for slow I/O.

## Verify

- [ ] Independent reads are parallel, not sequential.
- [ ] Effects are not driving derived state loops.
- [ ] Memoization exists because of a measured hotspot or memoized child boundary.
- [ ] Large lists are virtualized when needed.
- [ ] Heavy client code is split behind lazy or route-level boundaries.

## Anti-Patterns

- **No `export *`**: Breaks tree-shaking.
- **No Sequential Await**: Causes waterfalls.
- **No memo by superstition**: profile before adding `useMemo` / `useCallback`.
- **No effect-driven derived state**: compute during render unless syncing external systems.
- **No Heavy Libs**: Avoid oversized dependencies when smaller choices exist.

## References

- [Framework Map](../references/framework-map.md)
- [REFERENCE.md](references/REFERENCE.md)

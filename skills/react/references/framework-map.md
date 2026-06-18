# React Framework Map

Reviewed: 2026-06-17

Official sources:
- https://react.dev/reference/react
- https://react.dev/reference/react/useEffect
- https://react.dev/reference/react/useEffectEvent
- https://react.dev/reference/react/useCallback
- https://react.dev/reference/react-compiler/configuration

## Default stance

- `react-component-patterns`: composition, props, and component boundaries.
- `react-hooks`: effects, refs, custom hooks, and event handling.
- `react-performance`: profiler-led rendering and bundle work.
- `react-state-management`: local vs shared vs server state decisions.
- `react-testing`: assertions around behavior and rerender safety.

## Modern defaults

- Components stay pure; effects only sync with external systems.
- Prefer local state before shared global state.
- Treat React Compiler as the first memoization pass when the repo uses it.
- Reach for `useEffectEvent` when effect logic needs current values without widening dependencies.
- Use transitions for non-urgent UI updates.

## Memoization decisions

- Compiler enabled and code simple: skip manual `useMemo` / `useCallback` unless profiler proves a need.
- Memoized child or expensive calc: add manual memoization only around the measured hotspot.
- Derived data that is cheap and local: compute during render.

## Smells that mean "load more skills"

- Effects set derived state.
- `useMemo` and `useCallback` spread everywhere without measurements.
- Context causes broad rerenders.
- Server and client concerns are mixed in the same tree when used with Next.js or RSC.

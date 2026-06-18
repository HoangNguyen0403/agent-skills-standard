---
name: react-hooks
description: Write React hooks with clean effect boundaries and measured memoization. Use when working with `useEffect`, custom hooks, refs, transitions, or hook dependency problems in React.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    - '**/*.jsx'
    keywords:
    - useEffect
    - useCallback
    - useMemo
    - useState
    - useRef
    - useContext
    - useReducer
    - useLayoutEffect
    - custom hook
---
# React Hooks Expert

## **Priority: P0 (CRITICAL)**

Effects sync external systems. Everything else should stay in render, event handlers, or custom hooks.

## Rules

- **Effects**: use `useEffect` only for subscriptions, timers, network lifecycle, DOM APIs, or other external systems.
- **Dependency churn**: objects recreated each render cause unstable dependencies; move to primitives, refs, or measured memoization.
- **Effect events**: use `useEffectEvent` when effect logic needs current props/state without widening dependencies.
- **Refs**: store mutable, non-render state in `useRef`.
- **Memoization**: add `useMemo` / `useCallback` only for measured hotspots or memoized child contracts.
- **Concurrency**: use `startTransition` / `useDeferredValue` for non-urgent updates.
- **Fetch cleanup**: use `AbortController` when an effect owns request cancellation.

## Verify

- [ ] Hooks stay at top level.
- [ ] Effects have cleanup when they subscribe, attach, or schedule.
- [ ] No effect exists only to derive render state from other render state.
- [ ] Dependency arrays reflect real external dependencies.
- [ ] Custom hooks hide internal wiring and expose a small API.

## Performance Checklist (Mandatory)

- [ ] **Rules of Hooks**: Called at top level? No loops/conditions?
- [ ] **Dependencies**: object/function deps exist for a reason, not by accident?
- [ ] **Cleanup**: `useEffect` subscriptions return cleanup functions?
- [ ] **Render Count**: component re-render excessively?

## Anti-Patterns

- **No Missing Deps**: Fix logic, don't disable linter.
- **No giant effects**: Split unrelated sync concerns.
- **No Derived State**: Compute during render, don't `useEffect` to sync state.
- **No Heavy Init**: Use lazy state initialization `useState(() => heavy())`.

## References

- [Framework Map](../references/framework-map.md)
- [Optimization Patterns](references/REFERENCE.md)

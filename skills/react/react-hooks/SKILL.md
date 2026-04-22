---
name: react-hooks
description: Write efficient React functional components and hooks. Use when writing custom hooks, optimizing useEffect, or working with useMemo/useCallback in React.
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

**Role**: React Performance Expert. Optimize renders, prevent memory leaks.

## Implementation Guidelines

- **Dependency Arrays**: exhaustive-deps Law. **Objects/arrays recreated each render**, causing **infinite loops** if not handled. Fix by ensuring **objects/arrays memoized** with **`useMemo`** before putting them in deps, or using **`useRef`** for stable refs.
- **Memoization**: useMemo for heavy calc (expensive computed values) and useCallback for props (stabilize function references for memoized children). **Measure first** to avoid premature complexity.
- **Custom Hooks**: Extract logic starting with use... — use `useState` for internal state and return only what's needed.
- **`useEffect`**: Sync with external systems ONLY. **Cleanup required** for subscriptions/event listeners. **Return cleanup function** from effect. Use **`AbortController`** for fetch cleanup to prevent state updates after unmount.
- **`useRef`**: Mutable state without re-renders (DOM, timers, tracking).
- **`useMemo`/`Callback`**: Measure first. Use for stable refs or heavy computation.
- **Stability**: Use `useLatest` pattern (ref) for event handlers to avoid dependency changes; see [useLatest ref pattern example](https://react.gg/hooks/use-latest-ref) for reference implementation.
- **Concurrency**: `useTransition` / `useDeferredValue` for non-blocking UI updates.
- **Initialization**: Lazy state `useState(() => expensive())`.

## Performance Checklist (Mandatory)

- [ ] **Rules of Hooks**: Called at top level? No loops/conditions?
- [ ] **Dependencies**: objects/arrays memoized before passing to deps?
- [ ] **Cleanup**: `useEffect` subscriptions return cleanup functions?
- [ ] **Render Count**: component re-render excessively?

## Anti-Patterns

- **No Missing Deps**: Fix logic, don't disable linter.
- **No Complex Effects**: Break tailored effects into smaller ones.
- **No Derived State**: Compute during render, don't `useEffect` to sync state.
- **No Heavy Init**: Use lazy state initialization `useState(() => heavy())`.

## References

- [Optimization Patterns](references/REFERENCE.md)
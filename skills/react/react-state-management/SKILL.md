---
name: react-state-management
description: Select and implement local, global, and server state patterns in React. Use when choosing or implementing state management (Context, Zustand, Redux, React Query) in React.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    - '**/*.jsx'
    keywords:
    - state
    - useReducer
    - context
    - store
    - props
---
# React State Management

## **Priority: P0 (CRITICAL)**


## Implementation Guidelines

- **Selection**: **Zustand for small-medium apps** (minimal boilerplate, no Providers). **Redux Toolkit (RTK) for large apps** needing **time-travel debugging** or complex middleware.
- **Server Data**: **Use React Query or SWR for server state**. **Never sync server data into `useState`** manually. Let **cache source of truth**.
- **Context API**: Use for **low-frequency data** like **theme, auth, locale**, or DI. Not for high-frequency updates (causes global re-renders). **Split Context** between State and Dispatch to optimize.
- **Global Updates**: Use **Zustand, Jotai, or Redux for frequent/complex updates** across app.
- **Local**: `useState` for simple UI toggles. `useReducer` for complex state machines.
- **Derived**: Compute at render time (`const fullName = ...`). No `useEffect` to sync state.
- **URL**: Store filter/sort params in **URL Search Params** (Single Source of Truth).
- **Immutability**: Never mutate. Use spread or Immer. Use `useMemo` on context value to prevent unnecessary re-renders (primitive performance tuning belongs in `hooks` skill).

> **Boundary note**: `hooks` skill covers primitive API usage (`useMemo`, `useCallback` rules). This skill covers _architectural_ state decisions — which tool to use for which state scope.

## Reference & Examples

For Zustand, Redux Toolkit, and TanStack Query patterns:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No Context for High-Freq**: Use Zustand/Redux for state that changes frequently.
- **No State Sync**: Compute derived values during render; avoid `useEffect` to sync state.
- **No Server Cache as UI State**: React Query/SWR for server data; don't duplicate into `useState`.
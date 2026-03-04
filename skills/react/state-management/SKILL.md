---
name: React State Management
description: Standards for managing local, global, and server state. Use when choosing or implementing state management (Context, Zustand, Redux, React Query) in React.
metadata:
  labels: [react, state, redux, zustand, context]
  triggers:
    files: ['**/*.tsx', '**/*.jsx']
    keywords: [state, useReducer, context, store, props]
---

# React State Management

## **Priority: P0 (CRITICAL)**

Choosing the right tool for state scope.

## Implementation Guidelines

- **Local**: `useState`. `useReducer` if complex (state machine).
- **Derived**: `const fullName = first + last`. No state sync.
- **Context**: DI, Theming, Auth. Not for high-freq data.
- **Global**: Zustand/Redux for app-wide complex flow.
- **Server Cache**: Use `React.cache` (RSC) to dedupe requests per render.
- **Server State**: React Query / SWR / Apollo. Cache != UI State.
- **URL**: Store filter/sort params in URL (Source of Truth).
- **Immutability**: Never mutate. Use spread or Immer. Use `useMemo` on context value to prevent unnecessary re-renders (primitive performance tuning belongs in `hooks` skill).

> **Boundary note**: `hooks` skill covers primitive API usage (`useMemo`, `useCallback` rules). This skill covers _architectural_ state decisions — which tool to use for which state scope.

## Reference & Examples

For Zustand, Redux Toolkit, and TanStack Query patterns:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

hooks | component-patterns | performance

---
name: React State Management
description: Standards for managing local, global, and server state.
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
- **Immutability**: Never mutate. Use spread or Immer.

## Anti-Patterns

- **No Prop Drilling > 2**: Use Context/Composition.
- **No Mirroring Refs**: Don't copy props to state.
- **No Multi-Source**: Single Source of Truth.
- **No Context Abuse**: Context causes full-tree re-render.

## Code

```tsx
// Derived State (Efficient)
function List({ items, filter }) {
  // Correct: Calculated on fly
  const visible = items.filter((i) => i.includes(filter));
  return (
    <ul>
      {visible.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

// Zustand (Global)
const useStore = create((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));
```

---
name: React Native State Management
description: Local and global state patterns with Context, Zustand, and Redux Toolkit.
metadata:
  labels: [react-native, state, redux, zustand, context]
  triggers:
    files: ['**/*.tsx', '**/*.ts']
    keywords: [useState, useContext, zustand, redux, state-management]
---

# React Native State Management

## **Priority: P1 (OPERATIONAL)**

## State Strategy

- **Local State**: Use `useState` for component-scoped state (forms, UI toggles).
- **Lifted State**: Share between siblings via parent component.
- **Context**: Share across components without prop drilling (theme, auth).
- **Zustand**: Lightweight global state for small-medium apps.
- **Redux Toolkit**: Complex apps with time-travel debugging needs.
- **Server State**: Use `@tanstack/react-query` for API data (caching, refetching).

## Context Pattern

```tsx
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be within ThemeProvider');
  return context;
}
```

## Zustand (Recommended for Most Apps)

```tsx
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Usage
const count = useStore((state) => state.count);
```

## Anti-Patterns

- **No Redux for Everything**: Start with Context/Zustand.
- **No Prop Drilling**: Use Context for global state.
- **No Derived State in State**: Compute in render.

## Reference & Examples

See [references/REFERENCE.md](references/REFERENCE.md) for Zustand Persistence, RTK Thunks, and Query Optimistic Updates.

## Related Topics

react/state-management | react/hooks

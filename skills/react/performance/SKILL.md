---
name: React Performance
description: Performance optimization patterns for React applications.
metadata:
  labels: [react, performance, optimization, memoization]
  triggers:
    files: ['**/*.jsx', '**/*.tsx']
    keywords: [memo, useMemo, useCallback, lazy, Suspense, performance]
---

# React Performance

## **Priority: P1 (OPERATIONAL)**

Performance optimization strategies for React applications.

## Implementation Guidelines

- **Measure First**: Use React DevTools Profiler before optimizing. Don't premature optimize.
- **Memoization**:
  - Use `React.memo` for expensive components that re-render with same props
  - Use `useMemo` for expensive calculations
  - Use `useCallback` for functions passed to memoized children
- **Code Splitting**:
  - Use `React.lazy` and `Suspense` for route-based splitting
  - Split large components and third-party libraries
- **Lists**: Always use stable `key` props. Avoid index as key for dynamic lists.
- **Virtual Scrolling**: Use libraries like `react-window` or `@tanstack/react-virtual` for long lists.
- **Images**: Use lazy loading, optimize sizes, use modern formats (WebP, AVIF).
- **Bundle Size**: Tree-shake unused code. Monitor bundle size with bundler analysis.

## Anti-Patterns

- **No Premature Optimization**: Don't optimize without measuring first.
- **No Overuse of Memoization**: Memoization has costs. Use only when needed.
- **No Inline Object/Array Props**: Extract to constants or useMemo to prevent re-renders.
- **No Anonymous Functions in Deps**: Define functions outside or use useCallback.

## Code

```jsx
import { memo, useMemo, useCallback, lazy, Suspense } from 'react';

// Memoized component
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* Expensive rendering logic */}</div>;
});

// useMemo for expensive calculations
function DataTable({ data }) {
  const sortedData = useMemo(() => {
    return data.slice().sort((a, b) => a.value - b.value);
  }, [data]);

  return <table>{/* Render sortedData */}</table>;
}

// useCallback for functions passed to children
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <MemoizedChild onClick={handleClick} />;
}

// Code splitting with lazy and Suspense
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Virtual scrolling for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Reference & Examples

For profiling, bundle analysis, and advanced optimization:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

component-patterns | hooks | state-management

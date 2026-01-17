---
name: React Hooks
description: Modern React hooks patterns and best practices.
metadata:
  labels: [react, hooks, custom-hooks]
  triggers:
    files: ['**/*.jsx', '**/*.tsx']
    keywords: [useState, useEffect, useCallback, useMemo, useRef, useContext, custom hook]
---

# React Hooks

## **Priority: P1 (OPERATIONAL)**

Best practices for using React hooks effectively.

## Implementation Guidelines

- **Rules of Hooks**:
  - Call hooks at the top level only (not in loops, conditions, or nested functions)
  - Call hooks only from React functions (components or custom hooks)
- **useState**: Use for component state. Initialize with function for expensive computations.
- **useEffect**:
  - Declare all dependencies in the array
  - Return cleanup function for subscriptions/timers
  - Use separate effects for unrelated concerns
- **useCallback**: Memoize functions passed to children. Include all dependencies.
- **useMemo**: Memoize expensive calculations. Don't overuse.
- **useRef**: Use for mutable values that don't trigger re-renders, DOM access, and previous values.
- **Custom Hooks**: Extract reusable logic. Prefix with `use`. Return what component needs.

## Anti-Patterns

- **No Missing Dependencies**: Always include all dependencies in useEffect/useCallback/useMemo.
- **No useEffect for Everything**: Don't use useEffect when you can derive values during render.
- **No Stale Closures**: Be aware of closure issues in callbacks. Use refs or functional updates.
- **No Ignoring ESLint**: Don't disable exhaustive-deps rule. Fix the underlying issue.

## Code

```jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// useState with function initializer
function ExpensiveComponent() {
  const [data, setData] = useState(() => {
    return expensiveOperation();
  });
}

// useEffect with cleanup
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Empty deps - run once

  return <div>{seconds}</div>;
}

// useCallback for memoized functions
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <Child onClick={handleClick} />;
}

// useMemo for expensive calculations
function DataProcessor({ items }) {
  const processedData = useMemo(() => {
    return items.map(item => expensiveTransform(item));
  }, [items]);

  return <div>{processedData.length} items</div>;
}

// useRef for mutable values and DOM access
function InputFocus() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// Custom hook
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const response = await fetch(url);
        const json = await response.json();
        
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.name}</div>;
}
```

## Reference & Examples

For advanced custom hooks and patterns:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

component-patterns | state-management | performance

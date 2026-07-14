# React Hooks Skill

## Purpose

Build maintainable React components and custom hooks using idiomatic React Hooks APIs. Prefer simple state flow, explicit dependencies, predictable effects, and reusable behavior.

Assumption: React 18+ function components with `eslint-plugin-react-hooks` enabled.

## Use This Skill When

- Creating or refactoring function components.
- Managing component state, effects, refs, memoization, or context.
- Designing custom hooks.
- Debugging stale closures, infinite effects, unnecessary renders, or invalid Hook usage.
- Writing Hook tests.

## Core Rules

1. Call Hooks only at the top level of React function components or custom hooks.
2. Never call Hooks inside loops, conditions, nested functions, event handlers, or `try`/`catch` blocks.
3. Keep each Hook focused on one concern.
4. Treat `useEffect` as synchronization with an external system, not as a general-purpose lifecycle callback.
5. Include every reactive value used by an effect, memo, or callback in its dependency array.
6. Prefer derived values over duplicated state.
7. Use functional state updates when the next value depends on the previous value.
8. Use `useReducer` when state transitions are complex or related.
9. Use refs for mutable values that must not trigger rendering.
10. Memoize only when it prevents measured or clearly avoidable work.

## `useState`

Use `useState` for local state that affects rendering.

```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  function increment() {
    setCount((previousCount) => previousCount + 1);
  }

  return (
    <button type="button" onClick={increment}>
      Count: {count}
    </button>
  );
}
```

Use a lazy initializer when initial state requires computation:

```tsx
const [items, setItems] = useState(() => loadInitialItems());
```

When updating objects or arrays, create a new value:

```tsx
setUser((previousUser) => ({
  ...previousUser,
  name: nextName,
}));

setItems((previousItems) =>
  previousItems.filter((item) => item.id !== itemId),
);
```

Do not mutate state directly:

```tsx
// Incorrect
user.name = nextName;
setUser(user);
```

## `useEffect`

Use `useEffect` to synchronize with external systems such as network requests, subscriptions, timers, browser APIs, or third-party widgets.

```tsx
import { useEffect, useState } from 'react';

export function DocumentTitle({ count }: { count: number }) {
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return null;
}
```

Return cleanup for subscriptions and timers:

```tsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();

  return () => {
    connection.disconnect();
  };
}, [roomId]);
```

Avoid effects for values that can be calculated during render:

```tsx
// Unnecessary
const [fullName, setFullName] = useState('');

useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// Preferred
const fullName = `${firstName} ${lastName}`;
```

### Fetching Data

Guard against updates after cancellation:

```tsx
useEffect(() => {
  const controller = new AbortController();

  async function loadUser() {
    const response = await fetch(`/api/users/${userId}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const nextUser = await response.json();
    setUser(nextUser);
  }

  loadUser().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    setError(error instanceof Error ? error : new Error('Unknown error'));
  });

  return () => controller.abort();
}, [userId]);
```

Do not make the effect callback itself `async`; return values from an async function are Promises, while effects may return only cleanup functions.

## `useReducer`

Use `useReducer` when several state fields change together or transitions are easier to describe as actions.

```tsx
import { useReducer } from 'react';

type State = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  error: string | null;
};

type Action =
  | { type: 'submit' }
  | { type: 'success' }
  | { type: 'failure'; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      return { status: 'submitting', error: null };
    case 'success':
      return { status: 'success', error: null };
    case 'failure':
      return { status: 'error', error: action.message };
    default:
      return state;
  }
}

export function SubmitButton() {
  const [state, dispatch] = useReducer(reducer, {
    status: 'idle',
    error: null,
  });

  async function handleSubmit() {
    dispatch({ type: 'submit' });

    try {
      await submitForm();
      dispatch({ type: 'success' });
    } catch {
      dispatch({ type: 'failure', message: 'Submission failed' });
    }
  }

  return (
    <button
      type="button"
      disabled={state.status === 'submitting'}
      onClick={handleSubmit}
    >
      {state.status === 'submitting' ? 'Submitting…' : 'Submit'}
    </button>
  );
}
```

Reducers should be pure: do not perform network requests, mutate external state, or read the current time inside them.

## `useRef`

Use `useRef` for:

- DOM nodes.
- Mutable values that persist across renders.
- Values that should not cause a re-render when changed.

```tsx
import { useEffect, useRef } from 'react';

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} type="search" aria-label="Search" />;
}
```

Store an interval handle without triggering renders:

```tsx
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

function start() {
  intervalRef.current = setInterval(tick, 1000);
}

function stop() {
  if (intervalRef.current !== null) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
}
```

Do not use refs when the value belongs in the rendered output.

## `useMemo`

Use `useMemo` to cache an expensive calculation or preserve a derived reference required by an optimized child.

```tsx
const visibleTodos = useMemo(
  () => todos.filter((todo) => todo.title.includes(query)),
  [todos, query],
);
```

The calculation must be pure. `useMemo` is an optimization, not a correctness mechanism.

Avoid memoizing trivial expressions:

```tsx
// Usually unnecessary
const label = useMemo(() => `${firstName} ${lastName}`, [
  firstName,
  lastName,
]);

// Preferred
const label = `${firstName} ${lastName}`;
```

## `useCallback`

Use `useCallback` when a stable function reference matters, commonly when passing a callback to a memoized child or when a callback is a dependency of another Hook.

```tsx
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

Prefer updater functions to avoid unnecessary dependencies:

```tsx
const addTodo = useCallback((title: string) => {
  setTodos((previousTodos) => [
    ...previousTodos,
    { id: crypto.randomUUID(), title },
  ]);
}, []);
```

Do not wrap every event handler in `useCallback` without a measurable reason.

## `useContext`

Use context for values shared across a component subtree, such as theme, locale, or authenticated user state.

```tsx
import { createContext, useContext } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (theme === null) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return theme;
}
```

Keep provider values stable when unnecessary provider updates would cause broad re-renders:

```tsx
const contextValue = useMemo(
  () => ({ user, signOut }),
  [user, signOut],
);

return (
  <AuthContext.Provider value={contextValue}>
    {children}
  </AuthContext.Provider>
);
```

## Custom Hooks

A custom Hook name must start with `use`. Extract reusable behavior, not merely arbitrary lines of component code.

```tsx
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

A custom Hook should:

- Have one clear responsibility.
- Expose a small, intentional API.
- Own setup and cleanup for the behavior it encapsulates.
- Avoid exposing internal state setters unless callers genuinely need them.
- Document whether returned objects or callbacks are stable references.

## Dependency and Closure Pitfalls

This effect captures the current `count` value:

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((previousCount) => previousCount + 1);
  }, 1000);

  return () => clearInterval(id);
}, []);
```

Use functional updates when an interval, event listener, or callback needs the latest state.

Avoid suppressing dependency warnings:

```tsx
// Avoid disabling react-hooks/exhaustive-deps.
```

If dependencies cause repeated work, restructure the code or move stable logic outside the component instead of hiding the dependency.

## Hook Ordering

Incorrect:

```tsx
if (enabled) {
  const [value, setValue] = useState('');
}
```

Preferred:

```tsx
const [value, setValue] = useState('');

if (!enabled) {
  return null;
}
```

Conditional behavior belongs inside the Hook or in the rendered logic, while Hook calls remain unconditional and ordered consistently.

## Testing Hooks

Test observable behavior rather than implementation details.

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('increments the counter', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

Use `act` around updates caused by Hook callbacks, timers, or asynchronous work.

## Review Checklist

- Are all Hooks called at the top level?
- Does every custom Hook name begin with `use`?
- Is state updated immutably?
- Could any derived state be calculated during render?
- Does each effect synchronize with an external system?
- Are effect dependencies complete?
- Is cleanup provided for subscriptions, timers, and event listeners?
- Are functional updates used where closures may become stale?
- Is memoization justified by a dependency or performance need?
- Are custom Hook APIs small and intentional?
- Are observable behaviors covered by tests?

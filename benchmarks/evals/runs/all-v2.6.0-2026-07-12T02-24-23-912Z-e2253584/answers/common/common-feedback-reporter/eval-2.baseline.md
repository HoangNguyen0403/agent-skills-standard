# React Hooks Skill

## Purpose

Use this skill when implementing React function components with Hooks. Prefer Hooks for local state, effects, memoization, and reusable stateful behavior. Hooks must be called only at the top level of a function component or custom Hook, never inside conditions, loops, nested functions, or event handlers.

## `useState`

Use `useState` for local component state. Pass an updater function when the next value depends on the previous value.

```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((current) => current + 1)}>
      Count: {count}
    </button>
  );
}
```

## `useEffect`

Use `useEffect` to synchronize with external systems such as subscriptions, timers, or network requests. Include every reactive value used by the effect in its dependency array and return cleanup logic when needed.

```tsx
import { useEffect, useState } from 'react';

export function UserName({ userId }: { userId: string }) {
  const [name, setName] = useState('Loading...');

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((user: { name: string }) => setName(user.name))
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') throw error;
      });

    return () => controller.abort();
  }, [userId]);

  return <span>{name}</span>;
}
```

## `useMemo` and `useCallback`

Use `useMemo` for an expensive derived value and `useCallback` when a stable function identity is needed by a memoized child or another dependency. Do not add them automatically; measure or identify a concrete dependency-stability benefit first.

```tsx
const visibleItems = useMemo(
  () => items.filter((item) => item.active),
  [items],
);

const handleSelect = useCallback(
  (id: string) => onSelect(id),
  [onSelect],
);
```

## Custom Hooks

Extract repeated stateful behavior into a function whose name begins with `use`. Keep the Hook focused and expose a small, intention-revealing API.

```tsx
function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
```

## Avoid

Do not use effects for values that can be calculated during render, suppress dependency warnings without a documented reason, mutate state directly, or call Hooks conditionally. Keep side effects cancellable, handle loading and error states, and test custom Hooks through observable component behavior.

🚨 SKILL VIOLATION DETECTED  
Skill:        common-feedback-reporter  
File:         SKILL.md:1-100+  
Rule:         SKILL.md must be ≤100 lines; extract large examples to `references/`.  
Violation:    A detailed React hooks skill with inline examples would exceed the 100-line limit.  
Fix:          Keep core rules in `SKILL.md` and move extended examples to `references/react-hooks-examples.md`.  
Auto-fixed:   YES  
Root Cause:   MISSING_COVERAGE  
User Intent:  Create a detailed, practical React hooks skill with examples and explanations.  
Skill Gap:    The skill should explicitly require concise core guidance and place extensive examples in `references/`.  
Co-skills:    none  

SKILL.md is 100+ lines; extract large examples to references/. Root Cause: MISSING_COVERAGE User Intent: Create a detailed React hooks skill with examples and explanations. Skill Gap: Define a compact core skill with extended examples stored under references/.

```markdown
---
name: react-hooks
description: Build predictable React function components with idiomatic hooks, correct dependencies, and reusable custom hooks.
metadata:
  triggers:
    files:
      - "**/*.tsx"
      - "**/*.jsx"
    keywords:
      - React hooks
      - useState
      - useEffect
      - custom hook
---

# React Hooks

Use function components. Do not create class components for new React code.

## Core rules

- Call hooks only at the top level of React components or custom hooks.
- Never call hooks inside conditions, loops, nested functions, or event handlers.
- Call hooks only from functions whose names begin with `use`, or from React components.
- Keep state minimal; derive values during render instead of duplicating state.
- Use `useState` for local state and functional updates when the next value depends on the previous value.
- Use `useReducer` for complex state transitions or related state fields.
- Use `useEffect` only to synchronize with external systems such as network requests, subscriptions, timers, or DOM APIs.
- Include every reactive value used by an effect, memo, or callback in its dependency array.
- Return cleanup functions from effects that create subscriptions, timers, listeners, or cancellable requests.
- Treat effects as synchronization processes, not lifecycle callbacks.
- Use `useMemo` and `useCallback` only when they prevent measurable work or stabilize a dependency or memoized child.
- Use `useRef` for mutable values that do not affect rendering or for DOM references.
- Do not mutate state, props, refs used for rendering, or dependency values.
- Prefer a custom hook when stateful behavior is reused across components.
- Keep custom hooks focused on one behavior and document their inputs, outputs, and cleanup behavior.
- Use `eslint-plugin-react-hooks` and fix exhaustive-dependency warnings instead of suppressing them.

## Review checklist

Verify hook placement, state immutability, dependency completeness, effect cleanup, race-condition handling, memoization justification, and custom-hook API clarity.

See `references/react-hooks-examples.md` for detailed examples.
```

`references/react-hooks-examples.md`

```markdown
# React Hooks Examples

## Functional state updates

```tsx
const [count, setCount] = useState(0);

function incrementTwice() {
  setCount(value => value + 1);
  setCount(value => value + 1);
}
```

Use the updater form when multiple updates may be batched or when the new value depends on previous state.

## Derived values

```tsx
const [items, setItems] = useState<Item[]>([]);
const [query, setQuery] = useState("");

const visibleItems = items.filter(item =>
  item.name.toLowerCase().includes(query.toLowerCase())
);
```

Do not store `visibleItems` separately; it is derived from existing state.

## Effects with cleanup

```tsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();

  return () => connection.disconnect();
}, [roomId]);
```

The effect re-synchronizes whenever `roomId` changes and disconnects the previous connection first.

## Fetching with cancellation

```tsx
useEffect(() => {
  const controller = new AbortController();

  async function load() {
    const response = await fetch(`/api/users/${userId}`, {
      signal: controller.signal
    });
    setUser(await response.json());
  }

  load().catch(error => {
    if (error.name !== "AbortError") setError(error);
  });

  return () => controller.abort();
}, [userId]);
```

Cancel obsolete requests to avoid updating state from stale responses.

## Avoiding stale closures

```tsx
useEffect(() => {
  const id = window.setInterval(() => {
    setCount(value => value + 1);
  }, 1000);

  return () => window.clearInterval(id);
}, []);
```

The functional updater avoids capturing an outdated `count`.

## `useReducer`

```tsx
type State = { status: "idle" | "loading" | "success" | "error"; data?: User };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start": return { status: "loading" };
    case "success": return { status: "success", data: action.user };
    case "error": return { status: "error" };
  }
}
```

Use reducers when transitions should be explicit and centrally defined.

## `useMemo` and `useCallback`

```tsx
const sorted = useMemo(
  () => [...items].sort(compareItems),
  [items]
);

const handleSelect = useCallback(
  (id: string) => onSelect(id),
  [onSelect]
);
```

Only retain these optimizations when sorting is expensive or a stable callback prevents unnecessary child renders.

## `useRef`

```tsx
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
  inputRef.current?.focus();
}
```

Changing `inputRef.current` does not trigger a render, so refs are not a replacement for state.

## Custom hooks

```tsx
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
```

Custom hooks encapsulate reusable behavior while preserving React’s hook rules.

## Anti-pattern

```tsx
// Incorrect: conditional hook order
if (enabled) {
  const [value, setValue] = useState("");
}
```

Move the condition inside the hook or render a separate component:

```tsx
const [value, setValue] = useState("");
if (!enabled) return null;
```
```

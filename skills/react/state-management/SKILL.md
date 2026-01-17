---
name: React State Management
description: State management patterns and best practices for React applications.
metadata:
  labels: [react, state, context, redux, zustand]
  triggers:
    files: ['**/*.jsx', '**/*.tsx']
    keywords: [useState, useReducer, context, redux, zustand, state, store]
---

# React State Management

## **Priority: P0 (CRITICAL)**

Standards for managing state in React applications.

## Implementation Guidelines

- **Local State**: Use `useState` for component-local state. Use `useReducer` for complex state logic.
- **Global State**:
  - Use Context API for low-frequency updates (theme, auth, locale)
  - Use Zustand or Redux Toolkit for high-frequency updates and complex state
  - Avoid Context for performance-critical state
- **State Colocation**: Keep state as close to where it's used as possible. Lift state only when necessary.
- **Immutability**: Always create new state objects/arrays. Never mutate state directly.
- **Derived State**: Derive computed values during render. Don't store derived state.
- **Server State**: Use TanStack Query (React Query) or SWR for server state management.
- **Form State**: Use React Hook Form or Formik for complex forms.

## Anti-Patterns

- **No Direct Mutation**: Don't mutate state. Use spread operators or immutable update patterns.
- **No Excessive Context**: Don't put everything in Context. Split contexts by domain.
- **No useEffect for Derived State**: Derive values during render, don't use effects.
- **No Mixing State Types**: Separate server state from client state.

## Code

```jsx
import { useState, useReducer, createContext, useContext } from 'react';

// Local state with useState
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Complex state with useReducer
function todoReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, { id: Date.now(), text: action.text, done: false }];
    case 'TOGGLE':
      return state.map(todo =>
        todo.id === action.id ? { ...todo, done: !todo.done } : todo
      );
    case 'DELETE':
      return state.filter(todo => todo.id !== action.id);
    default:
      return state;
  }
}

function TodoList() {
  const [todos, dispatch] = useReducer(todoReducer, []);
  
  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => dispatch({ type: 'TOGGLE', id: todo.id })}
          />
          <span>{todo.text}</span>
          <button onClick={() => dispatch({ type: 'DELETE', id: todo.id })}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

// Context for global state
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    const userData = await api.login(credentials);
    setUser(userData);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

## Reference & Examples

For Zustand, Redux Toolkit, and TanStack Query patterns:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

hooks | component-patterns | performance

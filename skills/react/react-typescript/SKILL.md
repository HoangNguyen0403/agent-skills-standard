---
name: react-typescript
description: Type React components and hooks with TypeScript patterns. Use when typing React props, hooks, event handlers, or component generics in TypeScript.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    keywords:
    - ReactNode
    - FC
    - PropsWithChildren
    - ComponentProps
    - react typescript
    - tsx types
    - props interface
    - generic component
    - useState type
    - useRef type
    - typed hooks
---
# React TypeScript

## **Priority: P1 (OPERATIONAL)**


## Implementation Guidelines

- **Components**: Prefer **interface/type (`Props`)** over **`React.FC`** (which implicit children). Use **`JSX.Element`** or **`ReactNode`** as return type.
- **Children**: For components that accept children, use **`PropsWithChildren<T>`** or explicitly type them as **`React.ReactNode`**.
- **Events**: Always type event handlers using specific React events, such as **`React.ChangeEvent<HTMLInputElement>`** or **`React.FormEvent<HTMLFormElement>`**.
- **Hooks**: For `useRef`, avoid `any`; use **`useRef<HTMLDivElement>(null)`**. For `useState`, use generics for complex types: **`useState<User | null>(null)`**.
- **Native Elements**: Use **`ComponentPropsWithoutRef<'button'>`** or **`ComponentPropsWithRef`** to extend native attributes safely.
- **Generics**: Implement generic components for reusable UI like lists using **`<T,>(props: ListProps<T>)`**.
- **Discriminated Unions**: Use **Discriminated Unions** for mutually exclusive props (e.g., `success` vs `error` states).
- **Utility Types**: Leverage **`Omit`**, **`Pick`**, and **`Partial`** to transform prop interfaces and avoid redundancy.

## Anti-Patterns

- **No `any`**: Use `unknown`.
- **No `React.FC`**: Implicit children deprecated/bad practice.
- **No `Function`**: Use `(args: T) => void`.

## References

See [references/example.md](references/example.md) for typed props, generic components, and hook ref patterns.
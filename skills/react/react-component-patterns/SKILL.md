---
name: react-component-patterns
description: Build modern React component architecture with composition patterns. Use when designing reusable React components, applying composition patterns, or structuring component hierarchies.
metadata:
  triggers:
    files:
    - '**/*.jsx'
    - '**/*.tsx'
    keywords:
    - component
    - props
    - children
    - composition
    - hoc
    - render-props
---
# React Component Patterns

## **Priority: P0 (CRITICAL)**


## Implementation Guidelines

- **Architecture**: Use **Compound Components** (e.g., `<Select><Select.Option /></Select>`) for complex state sharing within UI unit. Use **Higher-Order Components (HOC)** for cross-cutting concerns (e.g., `withAuth`).
- **Composition**: Prefer **Slots** or **Render Props** (`render={(data) => ...}`) over deep prop hierarchies. Use `children` prop for layout-based composition.
- **Components**: Distinguish between **Controlled** (state from props) and **Uncontrolled** (local `useRef` state) components. Favor controlled for form validation.
- **Props**: Use **Explicit TS interfaces**. Avoid **Prop Drilling** by leveraging **Context API** or **Zustand** for global/deeply nested state.
- **Boolean Props**: Shorthand `<Cmp isVisible />` vs `isVisible={true}`.
- **Conditionals**: Ternary (`Cond ? <A/> : <B/>`) over `&&` for rendering consistency (prevents `0` rendering).
- **Function Components**: Only hooks. No classes. Small size (<250 lines). One component per file.
- **Exports**: Named exports only. **PascalCase** naming.

## Anti-Patterns

- **No Classes**: Use hooks.
- **No Prop Drilling**: Use Context/Zustand.
- **No Nested Definitions**: Define components at top level.
- **No Index Keys**: Use stable IDs.
- **No Inline Handlers**: Define before return.

## References

See [references/patterns.md](references/patterns.md) for Composition, Compound Components, and Render Props examples.
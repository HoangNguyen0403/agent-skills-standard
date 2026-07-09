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

- **Architecture (default)**: Composition first — `children`/named slot props for layout, **Compound Components** (e.g., `<Select><Select.Option /></Select>`) via Context for implicit shared state within one UI unit. Reach for **Higher-Order Components** or classic **Render Props** (`render={(data) => ...}`) only when composition can't express it (e.g. wrapping a third-party class component) — hooks cover most cross-cutting concerns HOCs used to.
- **React 19**: `ref` is a regular prop on function components — no `forwardRef` needed for new code. Use `use(promise)` / `use(context)` to read a promise or context conditionally in render instead of `useContext` + extra `useEffect` plumbing.
- **Components**: Distinguish between **Controlled** (state from props) and **Uncontrolled** (local `useRef` state) components. Favor controlled for form validation.
- **Props**: Use **Explicit TS interfaces**. Avoid **Prop Drilling** by leveraging **Context API** or **Zustand** for global/deeply nested state.
- **Boolean Props**: Shorthand `<Cmp isVisible />` vs `isVisible={true}`.
- **Conditionals**: Ternary (`Cond ? <A/> : <B/>`) over `&&` for rendering consistency (prevents `0` rendering).
- **Function Components**: Only hooks. No classes. Small size (<250 lines). One component per file.
- **Exports**: Named exports only. **PascalCase** naming.

```tsx
function ThemedInput({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> } & InputProps) {
  return <input ref={ref} className={useTheme().input} {...props} />;
}
```

## Verify

- [ ] Shared implicit state uses Compound Components + Context, not prop drilling.
- [ ] `ref` passed as a plain prop (no `forwardRef`) on components targeting React 19.
- [ ] HOC/classic render-props only where composition genuinely can't express the wrap.

## Anti-Patterns

- **No Classes**: Use hooks.
- **No Prop Drilling**: Use Context/Zustand.
- **No Nested Definitions**: Define components at top level.
- **No Index Keys**: Use stable IDs.
- **No forwardRef on new React 19 code**: Accept `ref` as a normal prop instead.

## References

See [references/patterns.md](references/patterns.md) for Composition, Compound Components, and Render Props examples.
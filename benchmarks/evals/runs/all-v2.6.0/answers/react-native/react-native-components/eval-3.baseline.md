# Defining a child component inside render

It is usually a problem. A function component declared inside the parent function gets a new component type on every parent render. React may unmount and remount that subtree, losing local state and focus, and it can add unnecessary work. It also makes memoization ineffective and often hides a component that deserves its own module.

Move it outside the parent and pass the required values as props:

```tsx
function Child({value}: {value: string}) {
  return <Text>{value}</Text>;
}

function Parent({value}: {value: string}) {
  return <Child value={value} />;
}
```

If the child is tiny and only needs a local closure, use an element or a render helper instead of defining a nested component. `useCallback` does not make a newly defined component type stable. Only keep a nested component deliberately when remounting is intended and its state/focus implications are understood.


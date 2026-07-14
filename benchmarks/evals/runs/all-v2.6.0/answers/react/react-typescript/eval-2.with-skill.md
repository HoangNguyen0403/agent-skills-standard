Use a generic component:

```tsx
interface ListProps<T> { items: T[]; renderItem: (item: T) => ReactNode; keyExtractor: (item: T) => string; }
function List<T,>(props: ListProps<T>): JSX.Element { /* render props.items */ return <>{props.items.map(props.renderItem)}</>; }
```

The generic `<T,>` comma avoids TSX parser ambiguity and preserves the item type.

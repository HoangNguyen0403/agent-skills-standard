~~~tsx
type ListProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
};

export function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={getKey(item, index)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
~~~

For a generic arrow function in TSX, write const List = <T,>(props: ListProps<T>) => ... so JSX parsing is unambiguous. Require a stable key rather than an index when items can reorder.

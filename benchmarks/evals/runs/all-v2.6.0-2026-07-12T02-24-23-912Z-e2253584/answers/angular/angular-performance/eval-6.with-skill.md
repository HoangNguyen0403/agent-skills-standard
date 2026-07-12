# Tracking items in Angular `@for` loops

Use the `track` expression directly in the `@for` block with a stable, unique identifier from each item:

```html
@for (item of items(); track item.id) {
  <article>
    <h2>{{ item.title }}</h2>
  </article>
} @empty {
  <p>No items found.</p>
}
```

Here `item.id` is the identity key. When the collection changes, Angular can match existing items to existing DOM nodes and update only what changed, instead of destroying and recreating every row. The `track` expression replaces the old `trackBy` function pattern for `@for`; do not add a separate `trackBy` callback.

Use an identifier that remains stable across refreshes and is unique within the collection. Avoid `track $index` for lists that can be inserted, removed, sorted, or reordered, because an index identifies a position rather than the item. Index tracking is appropriate only for a truly static list whose order and membership never change. Keep the component `OnPush` and represent changing collections with signals when possible so the loop is checked when its relevant state changes.


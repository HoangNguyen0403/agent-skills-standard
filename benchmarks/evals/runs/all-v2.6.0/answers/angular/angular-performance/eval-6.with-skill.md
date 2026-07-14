In modern Angular, `@for` uses a `track` expression instead of a `trackBy` function:

```ts
items = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Orange' },
];
```

```html
@for (item of items; track item.id) {
  <p>{{ item.name }}</p>
}
```

Use a stable unique identifier such as `item.id`. The `track` expression replaces `trackBy` and helps Angular reuse existing DOM nodes instead of destroying and recreating them.

For older `*ngFor` syntax:

```html
<div *ngFor="let item of items; trackBy: trackById">
  {{ item.name }}
</div>
```

```ts
trackById(index: number, item: { id: number }): number {
  return item.id;
}
```

Use the `track` clause inside the Angular `@for` block:

```html
@for (user of users; track user.id) {
  <p>{{ user.name }}</p>
}
```

`track` should identify each item with a stable, unique value—typically an ID:

```html
@for (item of items; track item.id; let i = $index) {
  <span>{{ i }}: {{ item.name }}</span>
}
```

Other valid examples:

```html
@for (value of values; track $index) {
  {{ value }}
}
```

Use `$index` only when the list is static or items have no stable identity. For nested or composite identity:

```html
@for (product of products; track product.category + '-' + product.id) {
  {{ product.name }}
}
```

Unlike `*ngFor`, `@for` does not use a `trackBy` callback such as `trackBy: trackById`; write the identity expression directly:

```html
<!-- @for equivalent of trackBy: trackById -->
@for (user of users; track user.id) {
  {{ user.name }}
}
```

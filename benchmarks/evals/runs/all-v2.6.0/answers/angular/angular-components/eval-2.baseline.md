# Using `@if` and `@for` in Angular templates

`@if` and `@for` are Angular's built-in control-flow blocks. They are available in modern Angular versions and use block syntax rather than the older structural directives `*ngIf` and `*ngFor`.

Use `@if` for conditional rendering:

```html
@if (user(); as currentUser) {
  <p>Welcome, {{ currentUser.name }}!</p>
} @else {
  <a routerLink="/login">Sign in</a>
}
```

The expression is reevaluated as Angular updates the view. `as` stores the result in a local template variable, which is useful when the expression is a signal or another value that would otherwise be repeated. You can chain conditions with `@else if`:

```html
@if (status() === 'loading') {
  <app-spinner />
} @else if (status() === 'error') {
  <p role="alert">Could not load the data.</p>
} @else {
  <app-results [items]="items()" />
}
```

Use `@for` to render a collection. Provide a stable `track` expression so Angular can reuse DOM nodes when the collection changes:

```html
<ul>
  @for (item of items(); track item.id; let index = $index) {
    <li>
      {{ index + 1 }}. {{ item.name }}
    </li>
  } @empty {
    <li>No items found.</li>
  }
</ul>
```

The loop provides contextual variables such as `$index`, `$first`, `$last`, `$even`, and `$odd`. Alias them with `let` when a clearer name is helpful. Track by a unique, stable item identifier such as `item.id`; tracking by `$index` is appropriate only when the list is append-only or items never reorder. Avoid tracking by an object expression that changes identity unnecessarily.

These blocks are built into the template syntax, so they do not require importing `CommonModule` just to use `@if` or `@for`. Other directives and pipes used in the same standalone component still need to be included in that component's `imports` array.


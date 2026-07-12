# Using `track` in Angular `@for` loops

The modern control-flow syntax uses a `track` expression, not the old `trackBy` property:

```html
@for (user of users; track user.id) {
  <user-row [user]="user" />
} @empty {
  <p>No users found.</p>
}
```

The expression should return a stable, unique key for each item in that collection. An ID from the backend is usually a good key. When the array is replaced after a refresh, Angular can match equal IDs to the existing views, so it updates, moves, or removes only the affected DOM nodes instead of recreating every row.

```ts
users = [
  { id: 'u-101', name: 'Ada' },
  { id: 'u-102', name: 'Linus' },
];

replaceUsers(next: User[]): void {
  this.users = next; // IDs let @for reuse rows across this replacement.
}
```

Use `track $index` only when the collection is truly static or changes only by appending at the end. It is a poor key for lists that can be reordered, inserted into, or deleted from: an index then identifies a position rather than the item, which can cause DOM state such as focus or an input value to be associated with the wrong record. Avoid random keys or keys that change whenever the list is rebuilt; those defeat reuse. Duplicate keys are invalid and should be fixed at the data boundary.

For older `*ngFor` syntax, the equivalent is a `trackBy` function:

```html
<user-row
  *ngFor="let user of users; trackBy: trackUser"
  [user]="user"
/>
```

```ts
trackUser(_index: number, user: User): string {
  return user.id;
}
```

Tracking does not eliminate the cost of producing or comparing the collection, nor does it make every row update-free. Combine stable tracking with `OnPush`, immutable updates or signals, cheap row templates, and virtual scrolling for very large lists.


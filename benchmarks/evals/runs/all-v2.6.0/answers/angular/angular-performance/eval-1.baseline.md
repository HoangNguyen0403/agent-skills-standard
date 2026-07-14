Assuming a modern Angular application:

- Use `ChangeDetectionStrategy.OnPush` for components.

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {}
```

Update inputs immutably so Angular can detect reference changes.

- Prefer signals for local and derived state:

```ts
users = signal<User[]>([]);
visibleUsers = computed(() => this.users().filter(user => user.active));
```

- Use `track` in `@for` loops, or `trackBy` with `*ngFor`, to avoid recreating unchanged DOM nodes:

```html
@for (user of users(); track user.id) {
  <user-row [user]="user" />
}
```

- Use the `async` pipe or signal bindings instead of manual subscriptions where possible.
- Avoid calling methods or allocating objects directly from templates; use cached values, `computed`, or pure pipes.
- Keep component templates and component trees small; move expensive calculations outside change detection.
- For large or frequently updated views, use `ChangeDetectorRef` deliberately:

```ts
constructor(private readonly cdr: ChangeDetectorRef) {}

refresh() {
  this.cdr.markForCheck(); // OnPush component: schedule checking
}
```

For manually controlled sections:

```ts
this.cdr.detach();
this.cdr.detectChanges(); // run only when needed
```

- Consider zoneless change detection for applications that do not need Zone.js-driven updates:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

Ensure all UI updates then use signals, input changes, template listeners, or explicit change-detection APIs.

- Debounce high-frequency events such as scroll, resize, and typing. For non-UI work, use `NgZone.runOutsideAngular()` and re-enter Angular only when the UI must update.
- Profile before and after changes with Angular DevTools and browser Performance tools; identify components checked excessively or expensive template work.

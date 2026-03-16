# Signals vs Observables

## When to use what?

| Feature      | Use Signals (Sync)               | Use Observables (Async Stream)        |
| ------------ | -------------------------------- | ------------------------------------- |
| **State**    | ✅ Best for state holding values | ❌ Overkill                           |
| **Events**   | ❌ Cannot handle streams         | ✅ Best for clicks, typing (debounce) |
| **Derived**  | ✅ `computed()`                  | ⚠️ `combineLatest` (complex)          |
| **Template** | ✅ Fine-grained updates          | ⚠️ `async` pipe (Zone.js overhead)    |

## Conversion Patterns

### Observable to Signal (Read)

```typescript
// Component
private userService = inject(UserService);
private route = inject(ActivatedRoute);

// Stream of IDs from route
id$ = this.route.params.pipe(map(p => p['id']));

// Fetch user when ID changes
user$ = this.id$.pipe(
  switchMap(id => this.userService.getUser(id))
);

// Expose as Signal to template
user = toSignal(this.user$);
```

### Signal to Observable (Write/React)

```typescript
searchQuery = signal('');

// Debounce search input
results$ = toObservable(this.searchQuery).pipe(
  debounceTime(300),
  switchMap((q) => this.api.search(q)),
);
```

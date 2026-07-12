# Exposing service state with `asReadonly()`

Create a writable signal privately and expose its read-only view publicly:

```ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionState {
  private readonly _user = signal<{ id: string; name: string } | null>(null);

  readonly user = this._user.asReadonly();

  setUser(user: { id: string; name: string }): void {
    this._user.set(user);
  }

  clearUser(): void {
    this._user.set(null);
  }
}
```

Consumers can read `state.user()` and react to it in templates or `computed()` values, but they cannot call `set()` or `update()` through `state.user`. This establishes a one-way boundary: the service owns state changes, and callers use named methods that can enforce validation, invariants, logging, or persistence.

Expose derived values with `computed()` as well:

```ts
readonly isAuthenticated = computed(() => this.user() !== null);
```

`asReadonly()` protects the signal’s write API; it does not deeply freeze the value. If the signal contains an array or object, callers could still mutate that object if they receive the same reference. Update collections immutably and, where necessary, expose immutable types or defensive copies:

```ts
private readonly _tags = signal<string[]>([]);
readonly tags = this._tags.asReadonly();

addTag(tag: string): void {
  this._tags.update(tags => tags.includes(tag) ? tags : [...tags, tag]);
}
```

For state that should never be writable even inside the service, use a `computed()` or a constant instead. For a global service, `providedIn: 'root'` gives the application injector one shared instance; changing the provider scope changes the lifetime and sharing behavior. Keep asynchronous loading and error transitions in service methods or a store abstraction rather than allowing components to set internal signals directly.


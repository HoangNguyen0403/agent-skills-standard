Use a singleton Angular service as a global store, keeping writable signals private and exposing read-only signals.

```ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppState {
  private readonly _user = signal<User | null>(null);
  private readonly _theme = signal<'light' | 'dark'>('light');

  readonly user = this._user.asReadonly();
  readonly theme = this._theme.asReadonly();

  readonly isLoggedIn = computed(() => this._user() !== null);

  setUser(user: User | null): void {
    this._user.set(user);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this._theme.set(theme);
  }
}
```

Consume it from any component or service:

```ts
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-header',
  template: `
    @if (state.isLoggedIn()) {
      <span>Welcome, {{ state.user()?.name }}</span>
    }

    <button (click)="state.setTheme('dark')">Dark mode</button>
  `,
})
export class HeaderComponent {
  readonly state = inject(AppState);
}
```

Use:

- `signal()` for writable state.
- `.set(value)` to replace state.
- `.update(value => ...)` to derive a new value from existing state.
- `computed()` for derived state.
- `effect()` only for side effects such as persistence or logging—not for derived state.
- `providedIn: 'root'` to create one application-wide service instance.

For complex state, organize the service into feature stores, such as `AuthState`, `CartState`, or `SettingsState`, instead of putting everything into one global store.

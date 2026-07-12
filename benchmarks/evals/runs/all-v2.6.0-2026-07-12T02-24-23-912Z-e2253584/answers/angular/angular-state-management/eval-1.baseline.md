# Managing global state with Angular Signals

For application-wide state, put the writable signals and the operations that change them in an injectable service. Expose read-only signals and computed values to components so that components cannot mutate the store directly.

```ts
import { Injectable, computed, signal } from '@angular/core';

export interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AppState {
  private readonly _user = signal<User | null>(null);
  private readonly _theme = signal<'light' | 'dark'>('light');
  private readonly _notifications = signal(0);

  readonly user = this._user.asReadonly();
  readonly theme = this._theme.asReadonly();
  readonly notificationCount = this._notifications.asReadonly();

  readonly isSignedIn = computed(() => this._user() !== null);
  readonly hasNotifications = computed(() => this._notifications() > 0);

  signIn(user: User): void {
    this._user.set(user);
  }

  signOut(): void {
    this._user.set(null);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this._theme.set(theme);
  }

  incrementNotifications(): void {
    this._notifications.update(count => count + 1);
  }

  clearNotifications(): void {
    this._notifications.set(0);
  }
}
```

A standalone component can inject the service and read signals by calling them in its template or code:

```ts
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    @if (state.isSignedIn()) {
      <span>Welcome, {{ state.user()?.name }}</span>
      <button (click)="state.signOut()">Sign out</button>
    }
    <span>Notifications: {{ state.notificationCount() }}</span>
  `,
})
export class HeaderComponent {
  readonly state = inject(AppState);
}
```

Signals track dependencies automatically. A component or `computed()` that reads `user()` will update when the user changes, while unrelated consumers do not need to rerun. Use `set()` for replacement and `update()` for a change based on the current value. For arrays and objects, create new values rather than mutating the existing value in place:

```ts
private readonly _items = signal<string[]>([]);

addItem(item: string): void {
  this._items.update(items => [...items, item]);
}
```

Keep server calls and other asynchronous work in a service method or a dedicated data-access layer, then update the signals when the request succeeds or fails. Model `loading`, `data`, and `error` explicitly when those states matter. Use `computed()` for values derived from state; reserve `effect()` for external side effects such as persistence or logging. A root-provided service is global for the injector that provides it, so use component or route providers when the state should instead be scoped to a feature instance.


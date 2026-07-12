# Managing global state with Angular Signals

Angular Signals are a good fit for global state when the state has a clear owner, such as a root-provided service or a feature store. Keep writable signals private, expose read-only signals, and expose methods as the write boundary.

~~~ts
import { Injectable, computed, signal } from '@angular/core';

type User = {
  id: string;
  name: string;
};

@Injectable({ providedIn: 'root' })
export class SessionState {
  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly displayName = computed(() => this.user()?.name ?? 'Guest');

  setUser(user: User): void {
    this._user.set(user);
  }

  clearUser(): void {
    this._user.set(null);
  }
}
~~~

A component consumes the state without owning its mutation logic:

~~~ts
import { Component, inject } from '@angular/core';

@Component({
  template: '<p>{{ session.displayName() }}</p>',
})
export class HeaderComponent {
  readonly session = inject(SessionState);
}
~~~

Use computed() for pure derived values such as totals, filtered lists, and authentication flags. Update arrays and objects immutably with .set() or .update(), for example items.update(current => [...current, item]); do not mutate an object held by a signal in place. Use effect() only for external side effects such as persistence, logging, or DOM integration, and do not use it to update other application signals.

For a complex feature with many actions, async workflows, or normalized entities, use an NgRx Signal Store instead of making one service carry all the state logic. Avoid BehaviorSubject as the default state container and keep components focused on rendering and user intent.


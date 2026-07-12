# Exposing service state with asReadonly()

Keep the mutable signal private and expose its read-only view with asReadonly(). Consumers can call the returned signal but cannot call .set() or .update() through that public property; the service remains the owner of state transitions.

~~~ts
import { Injectable, computed, signal } from '@angular/core';

interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly displayName = computed(() => this.user()?.name ?? 'Guest');

  setUser(user: User): void {
    this._user.set(user);
  }

  clearUser(): void {
    this._user.set(null);
  }

  async loadUser(id: string): Promise<void> {
    this._loading.set(true);
    try {
      const user = await this.fetchUser(id);
      this._user.set(user);
    } finally {
      this._loading.set(false);
    }
  }

  private async fetchUser(id: string): Promise<User> {
    // Replace with an injected API client in a real application.
    return { id, name: 'Example User' };
  }
}
~~~

A component reads user() and loading() and invokes loadUser() or clearUser(). It cannot accidentally mutate the service's state through the read-only signals. asReadonly() protects the signal interface, not the object graph: do not mutate a returned object or array in place; replace it with a new value through a service method.

Use computed() for values such as displayName that are pure functions of the source signals. If the service becomes a large feature state container with many derived values and workflows, move the same principles into an NgRx Signal Store with withState, withComputed, and withMethods.



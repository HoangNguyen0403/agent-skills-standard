# Reactive calls with `httpResource()`

`httpResource()` is the signal-based resource API for HTTP reads. It uses the configured `HttpClient`, so the application still needs `provideHttpClient()` (and any interceptors) in its providers. The request factory is reactive: when a signal read by that factory changes, Angular starts a request for the new request description and manages loading, value, error, and stale-request behavior.

Example component:

```ts
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user',
  standalone: true,
  template: `
    @if (user.isLoading()) {
      <p>Loading...</p>
    } @else if (user.error(); as error) {
      <p role="alert">Could not load the user.</p>
    } @else if (user.value(); as value) {
      <h2>{{ value.name }}</h2>
    }

    <button type="button" (click)="user.reload()">Reload</button>
  `,
})
export class UserComponent {
  readonly userId = signal('42');

  readonly user = httpResource<User>(() => {
    const id = this.userId();

    // Returning undefined disables the request while no ID is selected.
    return id
      ? {
          url: `/api/users/${encodeURIComponent(id)}`,
          method: 'GET',
        }
      : undefined;
  });
}
```

The resource exposes signal-like state such as `value()`, `isLoading()`, `error()`, and `status()`. `reload()` explicitly repeats the current request. Query parameters, headers, and a request body can be included in the returned HTTP request object; any signal used to construct them becomes a dependency.

Use `httpResource()` primarily for declarative, signal-driven reads. It is not a replacement for an ordinary `HttpClient` observable in every situation: use `HttpClient` directly when an operation is naturally an RxJS stream, when fine-grained RxJS operators are needed, or for command-style mutations whose execution should happen only after an explicit user action. Check the Angular version's API status if the project labels resource APIs experimental, since their exact surface can evolve between Angular releases.


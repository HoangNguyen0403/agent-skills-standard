# Reactive HTTP calls with `httpResource()`

`httpResource<T>()` is a signal-based wrapper around `HttpClient`. It starts the request eagerly, tracks its lifecycle, and automatically refetches when a signal read by the request function changes.

```typescript
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-details',
  template: `
    @if (userResource.hasValue()) {
      <h2>{{ userResource.value().name }}</h2>
    } @else if (userResource.error()) {
      <p role="alert">Could not load the user.</p>
    } @else if (userResource.isLoading()) {
      <p>Loading...</p>
    }
    <button type="button" (click)="userResource.reload()">Reload</button>
  `,
})
export class UserDetailsComponent {
  readonly userId = signal('42');

  readonly userResource = httpResource<User>(
    () => `/api/users/${this.userId()}`,
  );
}
```

The resource exposes signals such as `isLoading()`, `hasValue()`, `value()`, `error()`, and `reload()`. Guard `value()` with `hasValue()` because reading it while the resource is in an error state can throw. `httpResource` uses the globally provided `HttpClient`, so configure that with `provideHttpClient(...)` and any required interceptors.

Use `httpResource` for reactive reads, not mutations. For `POST`, `PUT`, or `DELETE`, keep the call in a service and use the typed `HttpClient` method directly. A changing signal cancels an in-flight resource request before issuing the next one.


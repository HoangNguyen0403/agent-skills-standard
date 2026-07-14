Use `httpResource<T>()` inside a service. Read signals in its request function; Angular then **auto-refetches** whenever those signals change.

```ts
import { Injectable, signal } from '@angular/core';
import { httpResource, HttpClient } from '@angular/common/http';

interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userId = signal('42');

  readonly userResource = httpResource<User>(
    () => `/api/users/${this.userId()}`
  );

  selectUser(id: string): void {
    this.userId.set(id);
  }
}
```

Consume the resource reactively:

```ts
@Component({
  template: `
    @if (users.userResource.isLoading()) {
      Loading...
    } @else if (users.userResource.error(); as error) {
      Failed to load user.
    } @else if (users.userResource.hasValue()) {
      {{ users.userResource.value().name }}
    }
  `
})
export class UserComponent {
  readonly users = inject(UserService);
}
```

Useful resource signals include:

```ts
userResource.isLoading()
userResource.hasValue()
userResource.error()
userResource.value()
userResource.reload()
```

Encapsulate all HTTP calls in services; components should only consume the exposed signals. For non-GET operations, use typed `HttpClient` calls such as `http.post<T>()`, handling errors in the service or a functional interceptor and reporting user-facing failures through a notification service. Interceptors can use `HttpContext` metadata such as `skip error handling` when needed.

Assuming Angular’s `httpResource()` API:

```ts
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-users',
  template: `
    @if (users.isLoading()) {
      <p>Loading…</p>
    } @else if (users.error(); as error) {
      <p>Request failed: {{ error }}</p>
    } @else {
      <pre>{{ users.value() | json }}</pre>
    }
  `,
})
export class UsersComponent {
  readonly userId = signal(42);

  readonly user = httpResource<User>(() =>
    `/api/users/${this.userId()}`
  );
}
```

The request function is reactive: whenever a signal read inside it changes, Angular automatically issues a new HTTP request.

For structured request options:

```ts
readonly user = httpResource<User>(() => ({
  url: '/api/users',
  method: 'GET',
  params: {
    id: String(this.userId()),
  },
  headers: {
    Accept: 'application/json',
  },
}));
```

Common resource signals include:

```ts
user.value();      // Response body, or undefined
user.status();     // ResourceStatus
user.isLoading();  // boolean
user.error();      // Error, or undefined
user.reload();     // Manually re-fetch
```

Skip the request conditionally by returning `undefined`:

```ts
readonly user = httpResource<User>(() =>
  this.userId() ? `/api/users/${this.userId()}` : undefined
);
```

Configure it in your application:

```ts
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()],
});
```

Use `HttpClient` directly for mutations such as `POST`, `PUT`, or `DELETE`; `httpResource()` is intended primarily for reactive reads and may automatically re-run when its reactive inputs change.

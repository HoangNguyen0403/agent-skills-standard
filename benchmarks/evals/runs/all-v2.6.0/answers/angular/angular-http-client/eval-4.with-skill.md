In `user.service.ts`, encapsulate all HTTP calls in the service and use typed responses with `inject(HttpClient)`:

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, shareReplay, throwError } from 'rxjs';

export interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = '/api/users';

  readonly users$ = this.http.get<User[]>(this.usersUrl).pipe(
    shareReplay(1),
    catchError(error => {
      // Delegate display to a notification service.
      return throwError(() => error);
    }),
  );

  getUser(id: string) {
    return this.http.get<User>(`${this.usersUrl}/${id}`);
  }

  createUser(user: Omit<User, 'id'>) {
    return this.http.post<User>(this.usersUrl, user);
  }
}
```

For reactive loading in Angular 17+, prefer `httpResource<User>()`; it auto-refetches when signal inputs change:

```ts
readonly userResource = httpResource<User>(
  () => `/api/users/${this.userId()}`,
);
```

Use `.isLoading()`, `.hasValue()`, `.error()`, `.value()`, and `.reload()`. For non-HTTP async work, use `resource<T, P>({ request, loader })`.

Avoid HTTP calls and manual GET subscriptions in components. Use `httpResource()` or `toSignal(http.get(...))` instead. Handle errors in the service or a global interceptor, using a notification service for display.

Configure functional interceptors with `HttpInterceptorFn` and `withInterceptors`:

```ts
provideHttpClient(
  withFetch(),
  withInterceptors([authInterceptor]),
);
```

Clone requests when adding headers:

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
```

Use `HttpContext` metadata when a request needs behavior such as `skip error handling` or custom caching.

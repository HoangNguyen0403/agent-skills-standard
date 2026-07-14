Assuming a modern Angular app:

1. Configure `HttpClient` in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
  ],
};
```

2. Use functional interceptors with `HttpInterceptorFn`:

```ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  return next(
    token
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : req
  );
};
```

3. Encapsulate all HTTP calls in services:

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface User {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUser(id: number) {
    return this.http.get<User>(`/api/users/${id}`).pipe(
      catchError(error => {
        // Log or transform the error; a notification service can display it.
        return throwError(() => error);
      })
    );
  }

  createUser(user: Omit<User, 'id'>) {
    return this.http.post<User>('/api/users', user);
  }
}
```

Do not call `HttpClient` directly from components. For Angular 17+, prefer `httpResource<T>()` for signal-based GET requests because it auto-refetches when signal inputs change:

```ts
userResource = httpResource<User>(
  () => `/api/users/${this.userId()}`
);
```

It provides `.isLoading()`, `.hasValue()`, `.value()`, `.error()`, and `.reload()`. Use `resource<T, P>()` for non-HTTP asynchronous work. For caching, use an interceptor or `shareReplay(1)` in a service. Use `HttpContext` metadata when an interceptor should, for example, `skip error handling`.

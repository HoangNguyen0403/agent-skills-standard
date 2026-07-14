Use `HttpInterceptorFn` and register it with `withInterceptors`:

```ts
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  const request = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(request);
};
```

Register it in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]),
    ),
  ],
};
```

Keep HTTP calls encapsulated in services:

```ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUser() {
    return this.http.get<User>('/api/user');
  }
}
```

Use `catchError` or a global interceptor for errors, with a notification service for display. Use `HttpContext` when requests need metadata such as `skip error handling`. For reactive GET data in Angular 17+, `httpResource<T>()` can automatically refetch when signal inputs change.

Avoid class-based interceptors; use functional `HttpInterceptorFn` instead.

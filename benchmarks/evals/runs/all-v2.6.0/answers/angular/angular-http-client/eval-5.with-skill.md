Use a functional `HttpInterceptorFn` registered globally with `provideHttpClient` and `withInterceptors`:

```ts
// error.interceptor.ts
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export const SKIP_ERROR_HANDLING = new HttpContextToken(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError(error => {
      if (!req.context.get(SKIP_ERROR_HANDLING)) {
        const message =
          error.status === 0
            ? 'Network error. Please try again.'
            : error.status >= 500
              ? 'Server error. Please try again later.'
              : error.error?.message ?? 'Request failed.';

        notifications.showError(message);
      }

      return throwError(() => error);
    })
  );
};
```

Register it in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';
import { errorInterceptor } from './error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([errorInterceptor]),
      withFetch()
    )
  ]
};
```

Keep request logic in services—encapsulate all HTTP calls and use typed responses:

```ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

Handle expected, operation-specific errors in the service with `catchError`; use a notification service for display. Components should not call `HttpClient` directly.

To bypass global handling for a request:

```ts
this.http.get<Data>('/api/data', {
  context: new HttpContext().set(SKIP_ERROR_HANDLING, true)
});
```

For reactive GET loading in Angular 17+, prefer `httpResource<T>()`, which auto-refetches when its signal inputs change and exposes `.isLoading()`, `.hasValue()`, `.error()`, `.value()`, and `.reload()`.

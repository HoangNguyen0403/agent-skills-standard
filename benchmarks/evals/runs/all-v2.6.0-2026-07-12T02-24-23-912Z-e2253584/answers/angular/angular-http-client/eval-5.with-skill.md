# Global HTTP error handling

Use a functional interceptor for cross-cutting HTTP failures. It can notify the user, handle status-specific behavior, and then rethrow the error so the service or caller can still apply domain-specific handling.

```typescript
// http-error.interceptor.ts
import { inject } from '@angular/core';
import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export const SKIP_GLOBAL_HTTP_ERROR = new HttpContextToken<boolean>(
  () => false,
);

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        !req.context.get(SKIP_GLOBAL_HTTP_ERROR)
      ) {
        const message =
          error.status === 0
            ? 'The network is unavailable.'
            : error.status >= 500
              ? 'The server is unavailable. Try again later.'
              : 'The request could not be completed.';

        notifications.error(message);
      }

      return throwError(() => error);
    }),
  );
};
```

Register it with the other functional interceptors:

```typescript
provideHttpClient(
  withInterceptors([authInterceptor, httpErrorInterceptor]),
  withFetch(),
)
```

For an endpoint that owns its own UI or fallback, opt out through `HttpContext` rather than adding special URL checks:

```typescript
const context = new HttpContext().set(SKIP_GLOBAL_HTTP_ERROR, true);
return this.http.get<Health>('/api/health', { context });
```

Do not swallow errors in the interceptor. `catchError` in a service can translate a known failure into a domain result, while the global interceptor remains responsible for cross-cutting notification, logging, or authentication redirects. The same interceptor pipeline applies to `httpResource` requests.


# Global HTTP error handling

Use an HTTP interceptor for cross-cutting handling, because every `HttpClient` request passes through it. The interceptor can classify errors, record telemetry, perform authentication recovery, and show a generic notification. It should normally rethrow the error so the feature that initiated the request can still make a specific decision.

```ts
import { inject } from '@angular/core';
import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { TelemetryService } from './telemetry.service';

export const SKIP_GLOBAL_HTTP_ERROR = new HttpContextToken<boolean>(
  () => false,
);

export const globalHttpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_GLOBAL_HTTP_ERROR)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const notifications = inject(NotificationService);
  const router = inject(Router);
  const telemetry = inject(TelemetryService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      telemetry.recordHttpFailure({
        method: req.method,
        url: req.url,
        status: error.status,
      });

      if (error.status === 401) {
        auth.clearSession();
        void router.navigateByUrl('/login');
      } else if (error.status === 0) {
        notifications.show('The network is unavailable.');
      } else if (error.status >= 500) {
        notifications.show('The service is temporarily unavailable.');
      }

      return throwError(() => error);
    }),
  );
};
```

Register it with `provideHttpClient(withInterceptors([globalHttpErrorInterceptor]))`. Avoid treating every status identically: a `400` or `422` usually belongs to the form or feature that can explain validation details, while `401`, connectivity failures, and server failures are useful global categories. Also avoid automatically showing a global toast for every error, since a local handler could otherwise produce duplicate or misleading UI.

For an endpoint that intentionally handles its own errors, pass an `HttpContext` value with `SKIP_GLOBAL_HTTP_ERROR` when creating the request. `ErrorHandler` is not a substitute for this: HTTP failures are observable errors and must be handled in the observable chain. The global interceptor should preserve that error signal, avoid logging secrets or sensitive request bodies, and use retry logic only for idempotent operations where retrying is safe.


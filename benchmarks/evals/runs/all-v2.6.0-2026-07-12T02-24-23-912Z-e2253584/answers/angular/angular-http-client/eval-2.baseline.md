# Functional HTTP interceptors

Angular functional interceptors implement `HttpInterceptorFn`. They receive an immutable `HttpRequest` and a handler function. Clone the request when changing it, then pass the clone to `next`.

For example, an authentication interceptor can add a bearer token:

```ts
import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
} from '@angular/common/http';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();

  // Do not attach an application token to unrelated third-party requests.
  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }

  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest);
};
```

Register the function with the `HttpClient` provider, usually in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

Interceptors can also transform responses because `next(...)` returns an observable of HTTP events. For example, an error interceptor can use `pipe(catchError(...))`, but it should either rethrow the error or deliberately replace it with a documented application error. Silently completing the stream makes callers believe that a failed request succeeded.

Keep each interceptor focused: authentication, correlation IDs, caching, and error handling are usually separate functions. Interceptor order is significant, so register functions in the order in which the request should be processed; response transformations unwind in the opposite direction. For requests that must opt out of a cross-cutting behavior, use an `HttpContextToken` rather than relying on URL string conventions.


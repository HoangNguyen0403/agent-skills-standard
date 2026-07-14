Create an `HttpInterceptorFn`, modify or observe the request, then register it with `withInterceptors`.

```ts
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authReq);
};
```

Register it when configuring `HttpClient`:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
  ],
};
```

The interceptor must return `next(req)` or the observable resulting from it. Since `HttpRequest` is immutable, use `req.clone()` to change headers, parameters, or the URL.

For example, logging responses:

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const started = Date.now();

  return next(req).pipe(
    tap(() => {
      console.log(`${req.method} ${req.urlWithParams} took ${Date.now() - started} ms`);
    })
  );
};
```

Multiple interceptors run in the order supplied:

```ts
provideHttpClient(
  withInterceptors([
    authInterceptor,
    loggingInterceptor,
  ])
);
```

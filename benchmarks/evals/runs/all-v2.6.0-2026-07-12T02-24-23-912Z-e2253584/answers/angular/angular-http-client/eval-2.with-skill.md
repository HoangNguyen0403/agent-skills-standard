# Creating a functional HTTP interceptor

Use `HttpInterceptorFn`, inject dependencies inside the function, and clone the immutable request before changing it. For example, an authentication interceptor can add a bearer token without changing the original request:

```typescript
// auth.interceptor.ts
import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
} from '@angular/common/http';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) {
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

Register the function when providing `HttpClient`:

```typescript
// app.config.ts
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
      withInterceptors([authInterceptor]),
      withFetch(),
    ),
  ],
};
```

Interceptors run for requests made through Angular’s `HttpClient`, including requests issued by `httpResource`. Keep them small and focused; use a separate functional interceptor for logging, caching, or global error handling. Do not use `HTTP_INTERCEPTORS` and a class unless legacy compatibility is unavoidable.


Use an `HttpInterceptor` to handle errors from every `HttpClient` request.

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Redirect to login or refresh authentication
      } else if (error.status === 403) {
        // Show access-denied handling
      } else if (error.status >= 500) {
        // Show a server-error notification
      } else if (error.status === 0) {
        // Network or CORS error
      }

      return throwError(() => error);
    })
  );
```

Register it globally:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([httpErrorInterceptor]))
  ]
});
```

Keep `return throwError(() => error)` if individual components still need to react to the error. For user-facing notifications, inject a notification service into the interceptor and avoid displaying duplicate messages for requests that handle errors locally.

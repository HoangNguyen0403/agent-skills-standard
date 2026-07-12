# Setting up `HttpClient` in Angular

For a standalone Angular application, provide `HttpClient` at the application root. Configure functional interceptors and the Fetch backend at the same boundary:

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

`withFetch()` is especially useful when the application uses SSR. Keep the interceptor list composed of `HttpInterceptorFn` functions; class-based interceptors are deprecated by this project’s HTTP-client guidance.

Inject `HttpClient` into a service and type every response rather than calling it from a component:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

For an NgModule-based bootstrap, `provideHttpClient(...)` can be placed in the root module’s `providers` instead. Avoid adding `HttpClientModule` in multiple injectors because interceptor configuration can become ambiguous.


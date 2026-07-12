# Making API calls in `user.service.ts`

Keep HTTP access in an injectable service, use domain types at the boundary, and return the `HttpClient` observable to the caller. The service should not subscribe merely to expose a result; `HttpClient` observables are lazy and each subscription can issue a request.

```ts
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/users';

  getById(id: string): Observable<User> {
    return this.http.get<User>(
      `${this.endpoint}/${encodeURIComponent(id)}`,
    );
  }

  list(search?: string): Observable<User[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<User[]>(this.endpoint, { params });
  }

  create(input: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.endpoint, input);
  }

  update(id: string, input: Partial<CreateUserRequest>): Observable<User> {
    return this.http.patch<User>(
      `${this.endpoint}/${encodeURIComponent(id)}`,
      input,
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.endpoint}/${encodeURIComponent(id)}`,
    );
  }
}
```

Register `provideHttpClient()` once at the application root before injecting this service. Put the API base URL in environment configuration or an injection token rather than scattering production URLs through methods. If the backend envelope differs from the UI model, map it in the service and validate untrusted data at the boundary instead of assuming that the TypeScript generic performs runtime validation.

For reads, expose `getById(...)` to a template and consume it with `user$ | async`, or use an Angular resource when a signal-based read model is more suitable. For imperative work such as a save button, subscribe in the component/facade and handle success, failure, and teardown there; use `takeUntilDestroyed()` when a subscription must be managed imperatively. Add retries only for operations that are safe to retry, and keep endpoint-specific error behavior close to the caller while cross-cutting concerns belong in interceptors.


# API calls in `user.service.ts`

Encapsulate all HTTP access in an injectable service. Inject `HttpClient` with `inject()`, type every response, and keep components focused on presentation and state selection.

```typescript
// user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

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

  readonly users$: Observable<User[]> = this.http
    .get<User[]>('/api/users')
    .pipe(
      catchError((error: unknown) => {
        // Log or map the error here, then preserve it for the caller.
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  getById(id: string): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }

  create(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>('/api/users', request);
  }
}
```

The `shareReplay(1)` cache is appropriate for a read that should be shared; omit it when each subscription must make a fresh request or add an explicit invalidation strategy after mutations. Do not manually subscribe in a component just to perform a GET. Consume `users$` with the `async` pipe, or convert it with `toSignal(this.userService.users$, { initialValue: [] })`. For reactive signal-driven reads, `httpResource<User>()` is another suitable service/component boundary.

Keep user-facing error display out of the component: map or classify errors in the service when the domain needs a fallback, and use a notification service or a global functional interceptor for cross-cutting presentation.


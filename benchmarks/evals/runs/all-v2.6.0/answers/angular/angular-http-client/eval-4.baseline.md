Assumption: `user.service.ts` is an Angular service. Inject Angular’s `HttpClient`, keep methods typed, and return the `Observable`; let the component/facade subscribe.

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  updateUser(id: string, user: UpdateUser): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, user);
  }
}
```

Use `HttpParams` for query parameters and an interceptor for auth/error handling. Do not call `subscribe()` inside the service unless the method intentionally performs a fire-and-forget side effect.

If this is NestJS instead, inject `HttpService` from `@nestjs/axios` and use `firstValueFrom()` when exposing an `async`/`Promise` API.

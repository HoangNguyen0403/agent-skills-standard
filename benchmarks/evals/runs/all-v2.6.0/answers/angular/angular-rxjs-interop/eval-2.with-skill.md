# Using `toSignal` for HTTP responses

Inject `HttpClient`, create the GET Observable, and expose it as a signal with a template-safe initial value:

```typescript
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-users',
  template: `
    @for (user of users(); track user.id) {
      <p>{{ user.name }}</p>
    }
  `,
})
export class UsersComponent {
  private readonly http = inject(HttpClient);

  readonly users = toSignal(
    this.http.get<User[]>('/api/users').pipe(
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );
}
```

`toSignal` subscribes to the HTTP Observable immediately, and `users()` updates when the response arrives. `initialValue: []` keeps the template from handling `undefined`; `catchError` turns a failed request into a valid empty-list state. In a real UI, use separate loading and error state when an empty list must be distinguished from an error.

Use `toSignal` for data that is rendered reactively. A POST or PUT is an explicit command, so trigger it with `subscribe()` or `lastValueFrom()` at the user action boundary and handle its success and error there instead of creating a signal just to execute the request.


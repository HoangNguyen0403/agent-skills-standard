Use Angular’s `resource<T, P>` when the async operation is not an HTTP request. Provide a reactive `request` signal and an async `loader`:

```ts
import { Injectable, signal, resource, inject } from '@angular/core';
import { UserStore } from './user.store';
import { NotificationService } from './notification.service';

@Injectable()
export class UserService {
  private readonly store = inject(UserStore);
  private readonly notifications = inject(NotificationService);

  readonly userId = signal('42');

  readonly userResource = resource<User, string>({
    request: () => this.userId(),

    loader: async ({ request: id, abortSignal }) => {
      try {
        return await this.store.loadUser(id, { signal: abortSignal });
      } catch (error) {
        this.notifications.showError('Unable to load user');
        throw error;
      }
    },
  });
}
```

Use the resource in a component or template:

```ts
const user = this.userService.userResource;

if (user.isLoading()) {
  // Show loading state
}

if (user.hasValue()) {
  console.log(user.value());
}

if (user.error()) {
  // Show fallback state
}

user.reload();
```

When `userId()` changes, the loader runs again automatically. The resource provides the full `.isLoading()` lifecycle control and cancellation through `abortSignal`.

For HTTP operations, use `httpResource<T>()` or typed calls such as `http.post<T>()`; encapsulate all HTTP calls in services. Handle errors there, using a notification service or an interceptor with a `skip error handling` option where appropriate.

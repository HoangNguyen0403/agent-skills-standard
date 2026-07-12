# Using `resource()` for non-HTTP asynchronous work

Use Angular's `resource()` when an asynchronous operation is driven by signals but is not an HTTP request—for example, reading IndexedDB, asking a Web Worker to compute a result, or loading from a native bridge. The resource tracks the current value, loading state, error, and reload operation. `httpResource()` is the HTTP-specific variant; `resource()` does not require `HttpClient`.

```ts
import { Injectable, inject, resource, signal } from '@angular/core';
import { ProfileCache } from './profile-cache.service';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly cache = inject(ProfileCache);
  readonly selectedId = signal<string | undefined>(undefined);

  readonly profile = resource({
    params: () => {
      const id = this.selectedId();
      return id === undefined ? undefined : { id };
    },
    loader: ({ params, abortSignal }) =>
      this.cache.read(params.id, abortSignal),
  });
}
```

`ProfileCache.read` represents an application-specific promise-returning method, such as an IndexedDB lookup:

```ts
read(id: string, abortSignal: AbortSignal): Promise<Profile> {
  return this.indexedDb.getProfile(id, { signal: abortSignal });
}
```

The loader runs when its parameter object changes. Returning `undefined` from `params` puts the resource in an idle state, and `profile.reload()` repeats the current operation. The resource exposes signal-like state such as `profile.value()`, `profile.isLoading()`, `profile.error()`, and `profile.status()`. Angular supplies an `AbortSignal`; pass it to the underlying API when possible so obsolete work is cancelled when the selected ID changes. If the underlying API cannot cancel, it should at least ignore an aborted result or ensure that stale work cannot overwrite current state.

Use a resource for repeatable, read-like asynchronous state. For a one-time command such as saving a form or deleting a record, call an explicit service method and model the mutation's pending/error/success state separately; do not hide a user-triggered write inside a resource whose parameters happen to change. As with other signal-based APIs, make sure the Angular version in use supports the resource API and follow its current type signatures.


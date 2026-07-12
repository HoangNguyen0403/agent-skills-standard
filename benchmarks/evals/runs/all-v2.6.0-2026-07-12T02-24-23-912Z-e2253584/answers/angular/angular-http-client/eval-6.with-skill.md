# `resource()` for non-HTTP async work

Use Angular’s `resource()` when the async operation is not an `HttpClient` request—for example, an IndexedDB read, a Web Worker calculation, or another promise-based operation. Its reactive request/parameter signal controls when the loader runs, and its lifecycle is exposed as signals.

Current Angular APIs call the reactive field `params`:

```typescript
import { resource, signal } from '@angular/core';

interface Preferences {
  theme: 'light' | 'dark';
}

declare function readPreferencesFromIndexedDb(
  profileId: string,
  signal: AbortSignal,
): Promise<Preferences>;

export class PreferencesStore {
  readonly profileId = signal('profile-42');

  readonly preferences = resource({
    params: () => this.profileId(),
    loader: ({ params, abortSignal }) =>
      readPreferencesFromIndexedDb(params, abortSignal),
  });
}
```

When `profileId()` changes, Angular runs the loader for the new value and can abort the previous load. Pass the provided `AbortSignal` into APIs that support cancellation. Use `hasValue()` before reading `value()`; inspect `isLoading()`, `error()`, or `status()` for the other states, and call `reload()` when an explicit refresh is needed.

The skill’s older example names the reactive option `request` and the loader field accordingly (`resource<T, P>({ request: () => params(), loader: ... })`). If the installed Angular version exposes that spelling, use its version-specific API; do not mix `request` and `params` in one object. In either form, keep `resource()` for read-like async work, not mutations that could be cancelled while in flight. For HTTP reads, prefer `httpResource<T>()`; for `POST` or other mutations, use a typed service method with `HttpClient`.


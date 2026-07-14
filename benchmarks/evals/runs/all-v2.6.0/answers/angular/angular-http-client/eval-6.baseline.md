Use Angular’s `resource()` with a `params` function and a `loader` for any Promise-based async operation—not only HTTP.

```ts
import { Component, signal, resource } from '@angular/core';

@Component({
  selector: 'app-profile',
  template: `
    @if (profile.isLoading()) {
      <p>Loading…</p>
    } @else if (profile.error(); as error) {
      <p>Failed: {{ error }}</p>
    } @else if (profile.value(); as data) {
      <pre>{{ data | json }}</pre>
    }
  `,
})
export class ProfileComponent {
  userId = signal('42');

  profile = resource({
    params: () => ({ id: this.userId() }),

    loader: async ({ params, abortSignal }) => {
      return loadProfileFromIndexedDb(params.id, abortSignal);
    },
  });

  reload() {
    this.profile.reload();
  }
}

async function loadProfileFromIndexedDb(
  id: string,
  abortSignal: AbortSignal,
): Promise<unknown> {
  if (abortSignal.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }

  // Replace with any non-HTTP async operation:
  // IndexedDB, WebSocket RPC, filesystem API, worker message, etc.
  return Promise.resolve({ id, name: 'Ada' });
}
```

Important behavior:

- `params` is reactive. When `userId()` changes, Angular reruns the `loader`.
- If `params` returns `undefined`, the loader is skipped.
- The loader receives `{ params, abortSignal, previous }`.
- `resource()` does not automatically cancel arbitrary Promises. Your async operation should honor `abortSignal` where possible.
- Read state through `value()`, `error()`, `isLoading()`, and `status()`.
- Call `reload()` to rerun the current operation manually.

For RxJS-based operations, use `rxResource()` instead of `resource()`.

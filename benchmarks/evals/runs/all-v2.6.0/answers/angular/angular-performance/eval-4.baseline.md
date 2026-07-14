Generally, yes—avoid expensive or side-effectful function calls in Angular templates.

Angular may reevaluate template expressions during change detection, so calls like:

```html
<div>{{ calculateTotal(items) }}</div>
```

can run many times. Prefer:

- Precomputed component properties
- `computed()` signals for derived state
- Pure pipes for reusable transformations
- `trackBy`/`track` functions only when needed for list rendering

Cheap, deterministic calls are usually acceptable:

```html
<button (click)="save()">Save</button>
```

Avoid calls that allocate objects/arrays, perform filtering or HTTP work, mutate state, or have side effects. Note that `OnPush` reduces unnecessary checks but does not make costly template calls free.

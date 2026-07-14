Angular forms anti-patterns:

- Using template-driven forms for non-trivial inputs; prefer Reactive Forms.
- Using an untyped `FormGroup`; define `FormGroup<T>` with explicit control types.
- Allowing nullable controls unintentionally; use `fb.nonNullable.group(...)` or `{ nonNullable: true }`.
- Keeping validation logic inside the component; extract standalone validator functions into a separate `validators.ts`.
- Subscribing to `valueChanges` without lifecycle cleanup; use `takeUntilDestroyed()` when syncing values to stores.

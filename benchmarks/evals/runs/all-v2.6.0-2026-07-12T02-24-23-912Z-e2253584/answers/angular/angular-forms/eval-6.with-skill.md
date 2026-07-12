# Angular forms anti-patterns

Common problems and their preferred replacements are:

- **Using template-driven forms for non-trivial workflows.** Complex validation, dynamic controls, persistence, and state synchronization become implicit and difficult to test. Prefer Reactive Forms for these cases.

- **Using an untyped form.** `FormGroup<any>` or an untyped `FormGroup` hides misspelled control names and incorrect value types. Define an explicit control map such as `FormGroup<LoginForm>` with `FormControl<string>` and `FormControl<boolean>` members.

- **Allowing nullable controls unintentionally.** A control created with the ordinary builder can produce `string | null`, which leaks null checks into otherwise non-nullable data. Use `fb.nonNullable.group(...)` or `{ nonNullable: true }` for individual controls.

- **Putting validation rules in the component or template.** This mixes concerns and makes rules hard to reuse and unit-test. Extract custom rules into standalone validator functions that return `ValidationErrors | null`, then attach them to the control or group.

- **Creating a `valueChanges` subscription without teardown.** It can retain component state after destruction. Pipe the subscription through `takeUntilDestroyed()` (usually with an injected `DestroyRef`) before syncing to a store or service.

- **Assuming `form.value` always contains every field.** Disabled controls are excluded from `value`. Use `getRawValue()` when the submission or store contract needs all controls, including disabled ones.

- **Mixing form APIs on one control.** Do not put `[(ngModel)]` beside `formControl` or `formControlName`; choose one form strategy for that control.

- **Creating feedback loops during store synchronization.** A form-to-store subscription combined with a store-to-form update can continuously trigger itself. Initialize carefully and use `emitEvent: false` for programmatic updates that should not be re-synced.

The general shape is a strictly typed, non-nullable reactive form with standalone validation and explicit, lifecycle-safe synchronization. This keeps form state predictable and the component focused on orchestration rather than containing every rule.


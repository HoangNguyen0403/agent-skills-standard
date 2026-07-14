Use **Reactive Forms** for any non-trivial Angular form. They provide explicit, strictly typed `FormGroup<T>` models, reusable validation, and better control over dynamic or state-driven inputs.

Use template-driven forms only for very small, straightforward forms with minimal validation.

Recommended pattern:

```ts
// validators.ts
import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordsMatch(
  control: AbstractControl
): ValidationErrors | null {
  const { password, confirmPassword } = control.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}
```

```ts
type SignupForm = {
  email: FormControl<string>;
  password: FormControl<string>;
};

form = this.fb.nonNullable.group<SignupForm>({
  email: ['', Validators.required],
  password: ['', Validators.required],
});
```

Keep validation in standalone functions such as `validators.ts`, never in the component class. Use `takeUntilDestroyed()` when syncing `valueChanges` to stores. Avoid untyped `FormGroup`; use `fb.nonNullable.group(...)` or `nonNullable: true` to prevent `null` values.

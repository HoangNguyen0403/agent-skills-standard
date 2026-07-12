# Writing a custom Angular validator

Define the validation rule as a standalone function. It receives an `AbstractControl` and returns `null` when valid or a `ValidationErrors` object when invalid.

```ts
// validators/password-strength.validator.ts
import {
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

export function passwordStrength(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '');
  const hasUpperCase = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  return hasUpperCase && hasNumber
    ? null
    : { weakPassword: { required: 'an uppercase letter and a number' } };
}
```

Attach the validator when constructing a strictly typed, non-nullable reactive form:

```ts
import { inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

interface LoginForm {
  password: FormControl<string>;
}

private readonly fb = inject(FormBuilder).nonNullable;

readonly form: FormGroup<LoginForm> = this.fb.group({
  password: ['', [Validators.required, passwordStrength]],
});
```

In the template, inspect the error by its key and show a user-facing message:

```html
<input formControlName="password" type="password" />
<small *ngIf="form.controls.password.hasError('weakPassword')">
  Use at least one uppercase letter and one number.
</small>
```

Keep the validator independent of the component so it can be unit-tested and reused. A validator should not mutate the control or perform side effects; it should only derive an error from the current value. For rules involving multiple fields, attach a validator to the containing `FormGroup` and read the relevant child controls there.


Use a standalone `ValidatorFn` in `validators.ts`, then attach it to a strictly typed reactive form.

```ts
// validators.ts
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim().toLowerCase();

    return value === name.toLowerCase()
      ? { forbiddenName: { value: control.value } }
      : null;
  };
}
```

```ts
// profile.component.ts
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forbiddenName } from './validators';

interface ProfileForm {
  username: string;
  email: string;
}

export class ProfileComponent {
  readonly form: FormGroup<ProfileForm>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      username: ['', [Validators.required, forbiddenName('admin')]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log(this.form.getRawValue());
  }
}
```

Display the custom error in the template:

```html
<input formControlName="username" />

@if (form.controls.username.hasError('forbiddenName')) {
  <p>This username is not allowed.</p>
}
```

`null` means valid; returning an object such as `{ forbiddenName: ... }` makes the control invalid. This uses Reactive Forms, `FormGroup<T>`, `fb.nonNullable.group(...)`, and keeps validation logic outside the component class.

Use Angular Reactive Forms with `FormBuilder.nonNullable`:

```ts
// profile.component.ts
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { profileValidator } from './validators';

interface ProfileForm {
  name: FormControl<string>;
  email: FormControl<string>;
}

@Component({
  // ...
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup<ProfileForm> = this.fb.nonNullable.group({
    name: ['', [Validators.required, profileValidator()]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => {
        // value.name and value.email are strings, never null
      });
  }

  submit(): void {
    if (this.form.valid) {
      const value = this.form.getRawValue(); // { name: string; email: string }
    }
  }
}
```

For an individual control, use `nonNullable: true`:

```ts
const name = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required],
});
```

Extract custom validation into a separate module:

```ts
// validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function profileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value.trim().length >= 2
      ? null
      : { profileNameTooShort: true };
}
```

`fb.nonNullable.group(...)` and `nonNullable: true` ensure controls reset to their initial values instead of `null`, and keep form values strictly typed as strings.

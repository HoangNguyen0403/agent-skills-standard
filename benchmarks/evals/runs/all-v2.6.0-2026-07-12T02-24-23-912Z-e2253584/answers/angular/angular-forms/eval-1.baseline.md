# Creating a typed reactive form in Angular

Use Angular's reactive-forms API and type each control explicitly when inference cannot express the intended domain type. Angular's typed forms are available in modern Angular versions.

```ts
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

type Role = 'user' | 'admin';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <label>
        Name
        <input formControlName="name" />
      </label>
      <label>
        Age
        <input type="number" formControlName="age" />
      </label>
      <select formControlName="role">
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" [disabled]="form.invalid">Save</button>
    </form>
  `,
})
export class ProfileComponent {
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    age: new FormControl<number | null>(null, {
      validators: [Validators.min(18)],
    }),
    role: new FormControl<Role>('user', { nonNullable: true }),
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // value is Partial<...> because disabled controls are omitted.
    // getRawValue() includes disabled controls when that is desired.
    const profile = this.form.getRawValue();
    console.log(profile.name, profile.age, profile.role);
  }
}
```

`name` is a `FormControl<string>`, `age` is a `FormControl<number | null>`, and `role` is a `FormControl<Role>`. The explicit `Role` type prevents arbitrary strings from entering the control. `nonNullable: true` removes `null` from a control's type and changes its reset behavior; use it only where `null` is not a valid value.

For larger forms, `FormBuilder` or `NonNullableFormBuilder` reduces repetition. Keep the form model aligned with the DTO at the boundary, but still map the form value to the API request rather than sending UI state blindly. Use `setValue` when the complete form shape is known and must match, and `patchValue` for intentional partial updates.


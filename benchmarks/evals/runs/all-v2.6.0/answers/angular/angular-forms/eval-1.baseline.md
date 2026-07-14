Use Angular’s typed reactive forms with `FormGroup`, `FormControl`, and `FormBuilder`:

```ts
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="profileForm" (ngSubmit)="submit()">
      <input formControlName="name" />
      <input formControlName="email" type="email" />

      <button type="submit" [disabled]="profileForm.invalid">
        Save
      </button>
    </form>
  `,
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.profileForm.valid) {
      const value = this.profileForm.getRawValue();
      // value is typed as:
      // { name: string; email: string }
      console.log(value);
    }
  }
}
```

`fb.nonNullable.group()` creates non-nullable controls. Angular infers the form’s value types from the initial values. Use `getRawValue()` when you need all values, including disabled controls; `form.value` may be a `Partial` object because disabled fields can be omitted.

Use Angular Reactive Forms with an explicitly typed `FormGroup` and non-nullable controls.

`validators.ts`:

```ts
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const blockedEmailValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const email = String(control.value).toLowerCase();

  return email.endsWith('@blocked.example')
    ? { blockedEmail: true }
    : null;
};
```

Component:

```ts
import {
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { blockedEmailValidator } from './validators';

type ProfileFormControls = {
  name: FormControl<string>;
  email: FormControl<string>;
};

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="name" />
      <input formControlName="email" type="email" />

      <button type="submit" [disabled]="form.invalid">
        Save
      </button>
    </form>
  `,
})
export class ProfileFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form: FormGroup<ProfileFormControls> =
    this.fb.nonNullable.group({
      name: ['', Validators.required],
      email: [
        '',
        [Validators.required, Validators.email, blockedEmailValidator],
      ],
    });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        // Sync `value` to a store or service here.
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    console.log(value); // { name: string; email: string }
  }
}
```

`fb.nonNullable.group(...)` ensures the controls produce non-null string values. For complex inputs, prefer this strictly typed `FormGroup<T>` approach over an untyped `FormGroup` or template-driven forms.

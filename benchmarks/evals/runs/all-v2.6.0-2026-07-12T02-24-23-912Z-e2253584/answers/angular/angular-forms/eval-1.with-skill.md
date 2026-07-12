# Creating a typed reactive form

Use Angular Reactive Forms and give the `FormGroup` an explicit control map. A non-nullable `FormBuilder` keeps the control values from becoming `null`:

```ts
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

@Component({
  selector: 'app-login',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email" type="email" />
      <input formControlName="password" type="password" />
      <label>
        <input formControlName="rememberMe" type="checkbox" />
        Remember me
      </label>
      <button type="submit">Sign in</button>
    </form>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly form: FormGroup<LoginForm> = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    // value is { email: string; password: string; rememberMe: boolean }.
    // Send it to the authentication service here.
  }
}
```

The `LoginForm` interface describes the controls, not merely their values, so TypeScript catches misspelled control names and incorrect control types. `getRawValue()` returns a complete typed value, including disabled controls. For a complex form, keep validation in the form configuration or standalone validator functions rather than embedding it in the component template or ad hoc submit logic.


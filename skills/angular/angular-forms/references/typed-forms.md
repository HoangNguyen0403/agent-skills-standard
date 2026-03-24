# Typed Forms

## Definition

```typescript
interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

@Component({...})
export class LoginComponent {
  fb = inject(FormBuilder).nonNullable;

  form: FormGroup<LoginForm> = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  submit() {
    if (this.form.valid) {
      // value is strictly typed: { email: string, ... }
      const value = this.form.getRawValue();
    }
  }
}
```

## Minimal Typed FormGroup

```typescript
interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({ /* ... */ })
export class LoginComponent {
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group<LoginForm>({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });
}
```

## Standalone Validator

```typescript
// validators/password.validator.ts
export function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  return hasUpperCase && hasNumber ? null : { weakPassword: true };
}
```

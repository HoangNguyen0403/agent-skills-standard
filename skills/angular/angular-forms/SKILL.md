---
name: angular-forms
description: "Build typed reactive forms with strict FormGroup typing, custom validators, and nonNullable controls in Angular. Use when implementing typed reactive forms, custom validators, or form control patterns. (triggers: FormBuilder, FormGroup, FormControl, Validators, reactive forms, typed forms)"
---

# Forms

## **Priority: P2 (MEDIUM)**

## 1. Use Strictly Typed Reactive Forms

- Always use Reactive Forms over Template-Driven for complex inputs.
- Define typed `FormGroup<T>` with explicit control types — never use untyped FormGroup.

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

## 2. Extract Validation Logic

- Create standalone validator functions in a separate file.
- Sync `valueChanges` to stores using `takeUntilDestroyed()`.

```typescript
// validators/password.validator.ts
export function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  return hasUpperCase && hasNumber ? null : { weakPassword: true };
}
```

## 3. Ensure NonNullable Controls

- Use `fb.nonNullable.group(...)` or `nonNullable: true` on individual controls.
- This ensures form values are always strings — avoids null in form values.

## Anti-Patterns

- **No Template-Driven Forms**: Use Reactive Forms for any non-trivial inputs.
- **No untyped FormGroup**: Always use strictly typed `FormGroup<T>`.
- **No validation in component**: Extract into standalone validator functions.

## References

- [Typed Forms](references/typed-forms.md)

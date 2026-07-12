# Template-driven versus reactive forms

Use Reactive Forms for complex or important input flows. They keep the form model, control types, validators, and state transitions in TypeScript, where they are explicit, typed, testable, and easier to compose for dynamic fields.

```ts
import { inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
} from '@angular/forms';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

private readonly fb = inject(FormBuilder).nonNullable;

readonly form: FormGroup<LoginForm> = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});
```

Reactive Forms are the better default when the form has several fields, cross-field or custom validation, dynamic controls, draft persistence, store synchronization, or substantial automated testing. They also support strictly typed `FormGroup<T>` definitions and non-nullable controls, making the submitted value predictable.

Template-driven forms can be reasonable for a small, mostly static form with minimal validation. They are quick to express in HTML and use `[(ngModel)]`, but the form model and behavior are more implicit, and complex conditional or dynamic rules become harder to maintain. They are not a good substitute for a typed reactive model in a non-trivial workflow.

Whichever approach is selected, do not mix `[(ngModel)]` with a reactive `formControl` or `formControlName` on the same element. For a complex form, prefer a typed `FormGroup`, configure validators separately, and use `getRawValue()` when a complete value including disabled controls is required.


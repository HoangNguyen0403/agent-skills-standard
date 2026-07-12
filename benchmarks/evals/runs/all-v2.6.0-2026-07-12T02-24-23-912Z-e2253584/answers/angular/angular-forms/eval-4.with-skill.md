# Using non-nullable reactive forms

Use `FormBuilder.nonNullable` when creating the form. It makes generated controls non-nullable and ensures operations such as `reset()` restore the initial value instead of introducing `null`.

```ts
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

interface ProfileForm {
  displayName: FormControl<string>;
  age: FormControl<number>;
  marketingOptIn: FormControl<boolean>;
}

@Component({
  selector: 'app-profile',
  template: `
    <form [formGroup]="form">
      <input formControlName="displayName" />
      <input formControlName="age" type="number" />
      <input formControlName="marketingOptIn" type="checkbox" />
    </form>
  `,
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly form: FormGroup<ProfileForm> = this.fb.group({
    displayName: ['', Validators.required],
    age: [0, [Validators.required, Validators.min(0)]],
    marketingOptIn: [false],
  });

  save(): void {
    const profile = this.form.getRawValue();
    // profile has string, number, and boolean properties; none is nullable.
  }
}
```

For an individual control, use the equivalent option explicitly:

```ts
const name = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required],
});
```

This is preferable to declaring a form as `FormGroup<any>` or repeatedly asserting away `null`. Note that `form.value` may omit disabled controls, while `form.getRawValue()` includes them; choose the accessor that matches the submission contract.


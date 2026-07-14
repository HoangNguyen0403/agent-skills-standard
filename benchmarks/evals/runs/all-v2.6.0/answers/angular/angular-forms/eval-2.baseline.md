```ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function forbiddenNameValidator(
  forbiddenName: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;

    return value?.toLowerCase() === forbiddenName.toLowerCase()
      ? { forbiddenName: { value } }
      : null;
  };
}
```

Use it with a reactive form:

```ts
import { FormControl, Validators } from '@angular/forms';

name = new FormControl('', [
  Validators.required,
  forbiddenNameValidator('admin')
]);
```

Display the error:

```html
<input [formControl]="name" />

@if (name.hasError('forbiddenName')) {
  <small>This name is not allowed.</small>
}
```

A validator must return:

- `null` when the value is valid
- a `ValidationErrors` object, such as `{ forbiddenName: true }`, when invalid

For asynchronous validation, use `AsyncValidatorFn` and return an `Observable<ValidationErrors | null>` or `Promise<ValidationErrors | null>`.

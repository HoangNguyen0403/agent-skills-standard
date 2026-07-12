# Writing a custom Angular form validator

A synchronous custom validator is a function with the `ValidatorFn` shape: it receives an `AbstractControl` and returns `null` when valid or a `ValidationErrors` object when invalid. Validators should be pure and should not modify the control they are validating.

```ts
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export function forbiddenWords(words: readonly string[]): ValidatorFn {
  const forbidden = new Set(words.map(word => word.trim().toLowerCase()));

  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim().toLowerCase();

    // Let Validators.required handle empty values.
    if (value === '') {
      return null;
    }

    return forbidden.has(value)
      ? { forbiddenWord: { value: control.value } }
      : null;
  };
}
```

Attach the returned validator to a control alongside built-in validators:

```ts
readonly form = new FormGroup({
  username: new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      forbiddenWords(['admin', 'root']),
    ],
  }),
});
```

For rules involving multiple fields, attach the validator to the containing `FormGroup`, not to one child. For example:

```ts
export const passwordsMatch: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmation')?.value;

  // Required validators can report missing values separately.
  if (!password || !confirmation) {
    return null;
  }

  return password === confirmation ? null : { passwordsMismatch: true };
};

readonly passwordForm = new FormGroup(
  {
    password: new FormControl('', { nonNullable: true }),
    confirmation: new FormControl('', { nonNullable: true }),
  },
  { validators: [passwordsMatch] },
);
```

Display the error at the level where it is attached, for example with `passwordForm.hasError('passwordsMismatch')`, and usually gate messages on `dirty` or `touched`. Do not call `setErrors` on a child from the group validator: Angular may overwrite those errors during the next validation pass.

For a server-backed rule, use `AsyncValidatorFn` and return a `Promise` or `Observable` of `ValidationErrors | null`. Configure an appropriate `updateOn` such as `'blur'`, and cancel or debounce requests when validating values from `valueChanges`; a synchronous validator should never perform network I/O.


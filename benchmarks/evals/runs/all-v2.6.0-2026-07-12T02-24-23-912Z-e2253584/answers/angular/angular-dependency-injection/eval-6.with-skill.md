For form validators, register each validator with Angular’s `NG_VALIDATORS` token and set `multi: true`. The multi flag makes Angular collect all matching providers into the validator array instead of replacing an earlier provider:

```ts
import { Directive, Injectable, InjectionToken } from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
  ValidatorFn,
} from '@angular/forms';

@Injectable()
export class NoWhitespaceValidator implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    return value.trim() === value
      ? null
      : { whitespace: true };
  }
}

@Directive({
  selector: '[appNoWhitespace]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useClass: NoWhitespaceValidator,
      multi: true,
    },
  ],
})
export class NoWhitespaceDirective {}
```

Use the directive on a form control:

```html
<input type="text" name="username" appNoWhitespace ngModel>
```

Add another validator by adding another provider with the same token and `multi: true`. If a validator needs runtime dependencies, use a factory and resolve those dependencies with `inject()`. The example uses `useClass` so it does not need `forwardRef`; circular references should be refactored rather than hidden with `forwardRef`.

For an application-specific validator registry rather than Angular forms, define your own typed token:

```ts
const requiredValidator: ValidatorFn = control =>
  control.value ? null : { required: true };

const strongPasswordValidator: ValidatorFn = control =>
  /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(control.value ?? ''))
    ? null
    : { strongPassword: true };

export const APP_VALIDATORS =
  new InjectionToken<ValidatorFn[]>('APP_VALIDATORS');

export const validationProviders = [
  { provide: APP_VALIDATORS, useValue: requiredValidator, multi: true },
  { provide: APP_VALIDATORS, useValue: strongPasswordValidator, multi: true },
];
```

Injecting `APP_VALIDATORS` returns the collected array. Use `NG_ASYNC_VALIDATORS` instead when the validators return asynchronous results.


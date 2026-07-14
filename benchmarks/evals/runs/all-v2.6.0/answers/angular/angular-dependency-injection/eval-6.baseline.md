# Creating multi providers for validators

A multi provider lets several providers contribute values to one injection token instead of replacing one another. For Angular Forms, register custom directive validators with the built-in `NG_VALIDATORS` token and set `multi: true`.

```ts
import {
  Directive,
  forwardRef,
} from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';

@Directive({
  standalone: true,
  selector: '[appNoWhitespace]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => NoWhitespaceValidatorDirective),
      multi: true,
    },
  ],
})
export class NoWhitespaceValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return typeof control.value === 'string' && /\s/.test(control.value)
      ? { whitespace: true }
      : null;
  }
}
```

Each directive that uses the same pattern adds another `NG_VALIDATORS` entry. Angular Forms collects those entries and runs all applicable validators for the control. `useExisting` is important when the provider should refer to the directive instance itself—for example, when it has inputs or state. `forwardRef` is needed here because the class is referenced in its decorator before the class declaration is evaluated. `useClass` would create a separate validator instance.

For function validators or an application-specific validator pipeline, define your own typed multi token:

```ts
import { ApplicationConfig, inject, InjectionToken } from '@angular/core';
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const APP_VALIDATORS = new InjectionToken<ValidatorFn[]>('app.validators');

const requiredValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  control.value == null || control.value === '' ? { required: true } : null;

const emailValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(control.value))
    ? null
    : { email: true };

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_VALIDATORS, useValue: requiredValidator, multi: true },
    { provide: APP_VALIDATORS, useValue: emailValidator, multi: true },
  ],
};

const validators = inject(APP_VALIDATORS);
```

The injected value is an array containing every contribution. Use `useFactory` with `multi: true` when a validator needs injected dependencies. All providers for a token must agree on the multi-provider contract; mixing a normal provider with `multi: true` for the same token is an error. For a single reactive-form control, validators can also be supplied directly in the control's validator array; use `NG_VALIDATORS` when integrating a reusable directive with Angular's template-driven or directive-based forms mechanism.


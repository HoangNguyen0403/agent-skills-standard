Assuming “signal store” means an `@ngrx/signals` store, use a strictly typed Reactive Form and synchronize it in both directions.

`profile.store.ts`

```ts
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type Profile = {
  name: string;
  email: string;
};

export const ProfileStore = signalStore(
  { providedIn: 'root' },

  withState<{ profile: Profile }>({
    profile: {
      name: '',
      email: '',
    },
  }),

  withMethods((store) => ({
    updateProfile(profile: Profile): void {
      patchState(store, { profile });
    },
  })),
);
```

Keep custom validation in a separate `validators.ts` file:

```ts
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const nonBlankValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  return String(control.value ?? '').trim().length > 0
    ? null
    : { nonBlank: true };
};
```

`profile.component.ts`

```ts
import {
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Profile, ProfileStore } from './profile.store';
import { nonBlankValidator } from './validators';

type ProfileFormControls = {
  name: FormControl<string>;
  email: FormControl<string>;
};

export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(ProfileStore);

  readonly form: FormGroup<ProfileFormControls> =
    this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', [
        Validators.required,
        nonBlankValidator,
      ]),
      email: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.email,
      ]),
    });

  constructor() {
    // Store -> form
    effect(() => {
      const profile = this.store.profile();

      // Avoid a feedback loop and avoid overwriting active edits.
      if (this.form.pristine) {
        this.form.reset(profile, { emitEvent: false });
      }
    });

    // Form -> store
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // getRawValue() returns the complete, non-nullable form value.
        this.store.updateProfile(this.form.getRawValue());
      });
  }
}
```

The important details are:

- Use Reactive Forms with an explicit `FormGroup<ProfileFormControls>`.
- Use `fb.nonNullable` or `nonNullable: true` so controls remain `FormControl<string>` instead of `FormControl<string | null>`.
- Use `valueChanges` plus `takeUntilDestroyed()`.
- Use `{ emitEvent: false }` when updating the form from the store to prevent a synchronization loop.
- The example preserves local edits by only applying external store changes while the form is pristine.

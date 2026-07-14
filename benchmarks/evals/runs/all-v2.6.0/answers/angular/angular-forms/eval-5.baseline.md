Assuming Angular 17+ and a signal-based store, use:

- `form.valueChanges` to update the store.
- An `effect()` to update the form when the store changes.
- `{ emitEvent: false }` to prevent an infinite update loop.

```ts
// profile.store.ts
import { Injectable, signal } from '@angular/core';

export interface Profile {
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly state = signal<Profile>({
    name: '',
    email: '',
  });

  readonly profile = this.state.asReadonly();

  updateProfile(patch: Partial<Profile>): void {
    this.state.update(profile => ({
      ...profile,
      ...patch,
    }));
  }
}
```

```ts
// profile.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileStore } from './profile.store';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <input formControlName="name" />
      <input formControlName="email" type="email" />
    </form>

    <pre>{{ store.profile() | json }}</pre>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  readonly store = inject(ProfileStore);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: this.store.profile().name,
    email: this.store.profile().email,
  });

  constructor() {
    // Form → signal store
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => {
        this.store.updateProfile(value);
      });

    // Signal store → form
    effect(() => {
      this.form.patchValue(this.store.profile(), {
        emitEvent: false,
      });
    });
  }
}
```

For NgRx SignalStore, expose equivalent `profile` and `updateProfile` methods; the component synchronization pattern remains the same. Use `emitEvent: false` whenever patching the form from the store.

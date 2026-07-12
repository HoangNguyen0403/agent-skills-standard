# Syncing a reactive form with a signal store

Treat the form as the editable boundary and subscribe to its `valueChanges` stream to update the signal store. Use `takeUntilDestroyed()` so the subscription is removed with the component. Keep the form typed and non-nullable.

```ts
// profile.store.ts
import { Injectable, signal } from '@angular/core';

export interface ProfileDraft {
  displayName: string;
  marketingOptIn: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  readonly draft = signal<ProfileDraft>({
    displayName: '',
    marketingOptIn: false,
  });

  updateDraft(value: ProfileDraft): void {
    this.draft.set(value);
  }
}
```

```ts
// profile-editor.component.ts
import {
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileStore } from './profile.store';

interface ProfileForm {
  displayName: FormControl<string>;
  marketingOptIn: FormControl<boolean>;
}

@Component({
  selector: 'app-profile-editor',
  template: `
    <form [formGroup]="form">
      <input formControlName="displayName" />
      <input formControlName="marketingOptIn" type="checkbox" />
    </form>
  `,
})
export class ProfileEditorComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(ProfileStore);

  readonly form: FormGroup<ProfileForm> = this.fb.group({
    displayName: [''],
    marketingOptIn: [false],
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // getRawValue() gives the complete typed draft if a control is disabled.
        this.store.updateDraft(this.form.getRawValue());
      });
  }
}
```

Initialize the form from the store before subscribing, or use `emitEvent: false` when patching it from store state. Otherwise a store-to-form update can create a feedback loop. For expensive persistence, add an appropriate operator such as `debounceTime` before the store update; do not remove the lifecycle teardown.


# Synchronizing a reactive form with a signal store

Treat the form and the store as separate concerns: the form owns transient editing state such as `dirty`, `touched`, and validation, while the signal store owns application state that other consumers need. Define which direction is authoritative for each transition and avoid an uncontrolled two-way loop.

For a simple signal-backed store:

```ts
import { Injectable, signal } from '@angular/core';

export interface Profile {
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  readonly profile = signal<Profile>({ name: '', email: '' });

  update(patch: Partial<Profile>): void {
    this.profile.update(current => ({ ...current, ...patch }));
  }
}
```

A component can initialize from the store, send user edits back through `valueChanges`, and apply external store changes without emitting another form event:

```ts
import { Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<!-- bind [formGroup]="form" and formControlName fields here -->`,
})
export class ProfileEditorComponent {
  private readonly store = inject(ProfileStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: [''],
  });

  constructor() {
    this.form.patchValue(this.store.profile(), { emitEvent: false });

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.store.update(value));

    effect(() => {
      const profile = this.store.profile();

      // Do not overwrite an in-progress edit caused by an unrelated store update.
      if (!this.form.dirty) {
        this.form.patchValue(profile, { emitEvent: false });
      }
    });
  }
}
```

The `emitEvent: false` option is essential on store-to-form updates; otherwise the patch triggers `valueChanges`, which writes back to the store and can create feedback loops. The `dirty` policy is application-specific: for a record switch, explicitly reset the form and clear its dirty state; for a conflict, show a choice instead of silently replacing edits.

If the store is an NgRx SignalStore, use its signal selectors and updater methods in the same way. For submit-only forms, do not synchronize every keystroke: read `form.getRawValue()` on submit and dispatch one update. For autosave, debounce the form stream, use `switchMap` or equivalent cancellation for HTTP requests, and represent saving/error state in the store. Avoid using an `effect` as an implicit bidirectional binding; make the two synchronization paths explicit and teardown subscriptions with `takeUntilDestroyed`.


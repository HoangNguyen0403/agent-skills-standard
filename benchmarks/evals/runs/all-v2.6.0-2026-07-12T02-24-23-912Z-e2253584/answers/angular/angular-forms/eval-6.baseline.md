# Common Angular forms anti-patterns

The main failure mode is having multiple owners of the same value or hiding the form's actual state. Common anti-patterns include:

- Mixing `[(ngModel)]` with `formControl` or `formControlName` on the same element. Pick template-driven or reactive forms for that control tree.
- Treating `as` casts or `UntypedFormGroup` as a substitute for a correct model. Use typed controls and keep nullable values explicit.
- Using `patchValue` when a complete shape is required. It silently ignores missing keys; use `setValue` when omissions should fail loudly, and use `patchValue` only for intentional partial updates.
- Mutating objects obtained from a form or assuming that changing `form.value` changes the controls. Update controls with `setValue`, `patchValue`, `reset`, or the appropriate array APIs.
- Putting the whole form in a global store and losing transient UI state such as `dirty`, `touched`, and validation. Store committed data or deliberate drafts, not every field by default.
- Synchronizing form and store in both directions without `{ emitEvent: false }` or a conflict policy. This can create feedback loops or overwrite unsaved edits.
- Subscribing to `valueChanges` or `statusChanges` without teardown. Use `takeUntilDestroyed`, an async pipe where applicable, or another explicit lifecycle strategy.
- Performing HTTP work in a synchronous validator, or making an async request on every keystroke without debounce/cancellation. Use `AsyncValidatorFn` for field validity and a controlled `valueChanges` pipeline for autosave/search.
- Calling `setErrors` inside a validator or changing the control being validated. Return a `ValidationErrors` object; attach cross-field errors to the group that owns the rule.
- Displaying every error immediately, before the user interacts, or relying only on a submit button's disabled state. Usually show a message after `touched`/`dirty` (and after submission when appropriate), and still guard the submit handler.
- Disabling controls by manually toggling the HTML `disabled` attribute while also using reactive forms. Set the disabled state in the control configuration or with `control.disable()`/`enable()` so Angular's model and DOM agree.
- Assuming `form.value` contains disabled fields. Disabled controls are omitted from that value; use `getRawValue()` when the business operation needs them, and decide whether disabled data should actually be submitted.
- Resetting a nullable form and assuming it returns to initial defaults. Use `nonNullable` where `reset()` should restore the initial value, and keep nullable controls where `null` is meaningful.
- Creating dynamic fields without stable `FormArray`/`FormGroup` structure, unique control names, or corresponding cleanup. Let the form tree represent the UI tree and use the collection APIs to add and remove controls.

A healthy form has one clear source of truth, typed domain boundaries, pure validators, explicit update timing (`change`, `blur`, or `submit`), lifecycle-safe subscriptions, and a deliberate policy for disabled, nullable, draft, and server-backed values.


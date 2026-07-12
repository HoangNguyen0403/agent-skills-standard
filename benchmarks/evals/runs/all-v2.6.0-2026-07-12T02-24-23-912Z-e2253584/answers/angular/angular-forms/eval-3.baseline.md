# Choosing template-driven or reactive forms

Neither approach is universally better. Choose based on form complexity and where you want the form state and validation rules to live.

| Situation | Better default |
| --- | --- |
| Small form with straightforward fields and simple validation | Template-driven |
| Complex validation, dynamic controls, or cross-field rules | Reactive |
| Strong TypeScript typing and predictable unit tests | Reactive |
| Form structure mostly expressed directly in a simple template | Template-driven |
| Reusable form logic shared across components | Reactive |

Template-driven forms use `FormsModule`, `ngModel`, and directives such as `required` and `minlength`. They are concise for a small form:

```html
<form #form="ngForm" (ngSubmit)="save(form)">
  <input name="email" [(ngModel)]="model.email" required email />
  <button type="submit" [disabled]="form.invalid">Save</button>
</form>
```

Reactive forms use `ReactiveFormsModule` and build the control tree in TypeScript:

```ts
readonly form = this.fb.nonNullable.group({
  email: ['', [Validators.required, Validators.email]],
});
```

They make state, validators, dynamic `FormArray` contents, and observable streams explicit, so they generally scale better for multi-step forms, conditional fields, rich validation, and testing without a rendered DOM. Typed reactive forms also expose more mistakes at compile time.

A template-driven form can be the right choice when the form is genuinely small and its rules are local to the template. A reactive form is the safer default for a shared or long-lived feature because the model is explicit and easier to refactor. Do not mix `[(ngModel)]` with `formControl` or `formControlName` on the same element; choose one forms strategy for each control tree. If a feature is becoming complex, migrate the whole subtree deliberately rather than keeping two competing sources of truth.


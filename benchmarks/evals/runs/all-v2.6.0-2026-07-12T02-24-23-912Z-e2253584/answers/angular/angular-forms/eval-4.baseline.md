# Using non-nullable reactive forms

Angular's `FormControl` is nullable by default because `reset()` is allowed to set it to `null`:

```ts
const name = new FormControl(''); // FormControl<string | null>
```

If a field always has a meaningful default and `null` is not part of its domain, opt into non-nullable behavior:

```ts
import { FormControl, FormGroup } from '@angular/forms';

const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl(0, { nonNullable: true }),
});

form.controls.name.setValue('Ada');
form.reset();

// name is reset to '' and age to 0, rather than to null.
```

For a whole form, use `NonNullableFormBuilder`, or use the `nonNullable` builder exposed by `FormBuilder`:

```ts
import { inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';

private readonly fb = inject(NonNullableFormBuilder);

readonly form = this.fb.group({
  name: ['', Validators.required],
  age: [0, Validators.min(0)],
});
```

The resulting controls have non-nullable value types, and `reset()` restores their initial values. This is both a TypeScript guarantee and a runtime reset policy; it is not merely a cast that hides `null`.

Do not make every control non-nullable automatically. Use a nullable control for values that are legitimately absent, such as an optional date or an unselected option:

```ts
const birthday = new FormControl<Date | null>(null);
```

Keep `null` in the form type when it represents real domain state, and map the form value to the API contract explicitly when the API uses a different representation. As with all reactive forms, `form.value` can be partial because disabled controls are omitted; use `getRawValue()` when disabled values must be included.


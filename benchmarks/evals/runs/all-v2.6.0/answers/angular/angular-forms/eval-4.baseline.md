In Angular reactive forms, use `nonNullable` to prevent controls from being typed as `T | null` and to make `reset()` restore the initial value instead of `null`.

```ts
import { FormControl, FormGroup, NonNullableFormBuilder } from '@angular/forms';

profile = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl(0, { nonNullable: true }),
});
```

Or use `NonNullableFormBuilder`:

```ts
constructor(private fb: NonNullableFormBuilder) {}

profile = this.fb.group({
  name: '',
  age: 0,
});
```

The inferred type is:

```ts
{
  name: string;
  age: number;
}
```

Without `nonNullable`, controls are usually nullable:

```ts
name = new FormControl(''); // FormControl<string | null>
```

With `nonNullable`:

```ts
name = new FormControl('', { nonNullable: true });
// FormControl<string>
```

`reset()` behavior differs:

```ts
profile.controls.name.reset();
console.log(profile.controls.name.value); // ''
```

A non-nullable control still allows values such as `''` or `0`; `nonNullable` affects TypeScript typing and reset behavior, not validation. Use validators separately:

```ts
name: new FormControl('', {
  nonNullable: true,
  validators: [Validators.required],
})
```

You can also configure `FormBuilder` per control:

```ts
form = this.fb.group({
  name: this.fb.nonNullable.control(''),
});
```

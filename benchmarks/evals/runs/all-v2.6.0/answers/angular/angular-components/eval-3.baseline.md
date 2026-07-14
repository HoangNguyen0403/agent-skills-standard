# Using required signal inputs

Use the `input` function inside a component or directive to declare a signal-based input. `input.required<T>()` is for an input that the parent must provide and that has no default value:

```ts
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `
    <article>
      <h2>{{ user().name }}</h2>
      <p>{{ summary() }}</p>
    </article>
  `,
})
export class UserCardComponent {
  user = input.required<{ name: string; role: string }>();

  summary = computed(() => `${this.user().name} — ${this.user().role}`);
}
```

The parent supplies the value with normal property binding:

```html
<app-user-card [user]="selectedUser" />
```

Read a signal input by calling it, `user()`, both in the class and in the template. Do not assign to it; inputs are read-only from the child. When the parent changes the bound value, the signal changes and any dependent template expressions or `computed` signals update automatically.

The required contract is checked by Angular's template compiler when a component is used without the input. It does not mean that a value is available during the component constructor, so read the input in the template, a `computed`, or an appropriate lifecycle/effect context. If a default is valid, use a regular input signal instead:

```ts
label = input('User');
```

You can expose a different public binding name with an alias:

```ts
user = input.required<User>({ alias: 'person' });
```

The parent then writes `[person]="selectedUser"`, while the child continues to read `this.user()`. Inputs can also use a `transform` when the public input needs normalization; keep transforms pure and predictable. For side effects caused by input changes, prefer an `effect` or a lifecycle design that makes the dependency explicit; use `computed` for derived values rather than copying input state.


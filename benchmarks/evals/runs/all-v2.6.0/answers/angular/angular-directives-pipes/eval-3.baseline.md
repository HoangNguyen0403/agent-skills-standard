# Writing a pure pipe

A pure pipe produces a result only from its input arguments and has no side effects. In Angular, `pure: true` is the default, but setting it explicitly documents the intent.

```ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'initials',
  standalone: true,
  pure: true,
})
export class InitialsPipe implements PipeTransform {
  transform(value: string | null | undefined, maximum = 2): string {
    if (!value?.trim() || maximum <= 0) return '';

    return value
      .trim()
      .split(/\s+/)
      .slice(0, maximum)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  }
}
```

Use it in a standalone component by importing the pipe:

```ts
@Component({
  standalone: true,
  imports: [InitialsPipe],
  template: `{{ user.name | initials: 2 }}`,
})
export class UserBadgeComponent {
  user = { name: 'Ada Lovelace' };
}
```

Angular reevaluates a pure pipe when a primitive argument changes or when an object/array argument gets a new reference. It does not reevaluate merely because a property inside the same object was mutated. For that reason, keep the pipe deterministic and update object or array inputs immutably when their derived display value must change. Use `pure: false` only for a deliberately impure case such as a value that depends on external mutable state; impure pipes run much more often and can be expensive.


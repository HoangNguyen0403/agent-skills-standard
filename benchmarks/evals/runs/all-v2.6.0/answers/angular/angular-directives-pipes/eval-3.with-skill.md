# Writing a pure pipe

Implement `PipeTransform` and explicitly mark the pipe as standalone and pure. A pure pipe is evaluated again only when one of its input values changes, which lets Angular cache the result for unchanged inputs.

```ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 50): string {
    if (value.length <= limit) {
      return value;
    }

    if (limit <= 1) {
      return '…'.slice(0, Math.max(limit, 0));
    }

    return `${value.slice(0, limit - 1)}…`;
  }
}
```

Import the standalone pipe where it is used:

```ts
@Component({
  standalone: true,
  imports: [TruncatePipe],
  template: `{{ description | truncate: 80 }}`,
})
export class DescriptionComponent {
  readonly description = 'A long description that may need to be shortened in the view.';
}
```

Keep the transform deterministic and free of side effects. Do not set `pure: false` for a static string transform; use a pipe such as `async` for observable subscription behavior. If the pipe receives an array or object, remember that mutating that value in place does not change its reference, so a pure pipe will not rerun.


# Creating a truncate pipe

Create a standalone, pure pipe and define the truncation contract in `transform`. The implementation below preserves strings within the limit and counts the ellipsis as the final character.

```ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 50): string {
    if (limit < 1) {
      return '';
    }

    return value.length <= limit
      ? value
      : `${value.slice(0, limit - 1)}…`;
  }
}
```

Use the pipe by importing it into the standalone component that renders it:

```ts
@Component({
  standalone: true,
  imports: [TruncatePipe],
  template: `
    <p>{{ title | truncate }}</p>
    <p>{{ summary | truncate: 100 }}</p>
  `,
})
export class ArticleHeaderComponent {
  readonly title = 'A title that may be too long for the available layout';
  readonly summary = 'A longer article summary displayed in a constrained card.';
}
```

The pipe is pure, so Angular can cache its result while `value` and `limit` are unchanged. Keep this transform deterministic and use `async` for observables rather than making a static string pipe impure. If `value` may be absent, define that contract explicitly with a nullable parameter and a fallback before calling `.length`.


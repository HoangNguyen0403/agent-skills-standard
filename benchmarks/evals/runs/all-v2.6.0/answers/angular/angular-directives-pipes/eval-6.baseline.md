# Creating a truncate pipe

Create a `PipeTransform` whose output is derived only from its arguments. The following standalone pure pipe treats the limit as the maximum output length, including the suffix.

```ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    limit = 80,
    suffix = '…',
  ): string {
    if (value == null || value.length <= limit) return value ?? '';

    const max = Math.max(0, Math.floor(limit));
    if (max === 0) return '';
    if (suffix.length >= max) return suffix.slice(0, max);

    return `${value.slice(0, max - suffix.length).trimEnd()}${suffix}`;
  }
}
```

Import it into a standalone component and use it in a template:

```ts
@Component({
  standalone: true,
  imports: [TruncatePipe],
  template: `
    <p>{{ description | truncate: 120 }}</p>
    <p>{{ title | truncate: 40: '...' }}</p>
  `,
})
export class ArticleSummaryComponent {
  title = 'An example article title';
  description = 'A longer article description that should be shortened for the summary view.';
}
```

Decide and document whether the limit counts the suffix, whether whitespace should be trimmed, and whether truncation should occur at a word boundary. This character-based version is predictable, but it can split a word (and, for some Unicode text, a grapheme cluster). For long or frequently changing lists, keeping the pipe pure avoids unnecessary recalculation; pass a new value when the source changes rather than mutating it in place.


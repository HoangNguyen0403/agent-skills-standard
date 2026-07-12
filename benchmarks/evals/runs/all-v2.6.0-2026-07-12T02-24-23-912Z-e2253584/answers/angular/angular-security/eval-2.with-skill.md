# Safely rendering HTML in Angular

First decide whether the content needs to be HTML at all. For user-generated content, render it as text so Angular escapes it:

```html
<div>{{ content }}</div>
```

If HTML is required, pass it through Angular's HTML sanitizer and bind the sanitized result. For example:

```typescript
import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';

@Component({
  selector: 'app-html-preview',
  standalone: true,
  template: `<div [innerHTML]="sanitizedContent"></div>`,
})
export class HtmlPreviewComponent {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() content = '';

  get sanitizedContent(): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, this.content) ?? '';
  }
}
```

Angular also sanitizes an `[innerHTML]` binding, but explicit sanitization makes the trust boundary clear and lets the result be reviewed or tested. Never use `bypassSecurityTrustHtml` for user input or unvetted API data. Reserve it for content with a verified, controlled provenance, such as a vetted static CMS fragment, and audit each use. Do not use an HTML sanitizer to make unsafe URLs, scripts, or other context changes trusted; validate each value for its actual Angular security context. Keep CSP headers configured by the server as defense in depth.


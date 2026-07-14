# Preventing XSS in Angular

Angular escapes interpolated values by default, so render untrusted content as text:

```html
<p>{{ userInput }}</p>
```

Do not put user-controlled data in `innerHTML`, and do not call `bypassSecurityTrustHtml`, `bypassSecurityTrustUrl`, or similar trust APIs on data received from a user or an external request. If HTML really must be displayed, bind through Angular's contextual sanitizer and review the source and allowed context carefully:

```typescript
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';

const sanitized = sanitizer.sanitize(SecurityContext.HTML, untrustedHtml) ?? '';
```

`[innerHTML]` is sanitized by Angular, but it is still a sensitive boundary; prefer text rendering whenever possible. Validate URLs and other external values against an allowlist appropriate to their context, and never embed API keys or other secrets in the Angular bundle. Configure a nonce-based Content Security Policy on the server, avoiding `unsafe-inline` and `unsafe-eval`, as defense in depth. Authentication should use server-managed `HttpOnly` cookies rather than JavaScript-readable storage. Test the rendered output with representative HTML and URL payloads, and audit every trust-marking call.


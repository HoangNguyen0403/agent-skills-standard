# Preventing XSS in Angular

Use Angular's normal template bindings and keep untrusted data in text or data contexts. Angular escapes interpolation and sanitizes risky property bindings by default, so prefer expressions such as:

```html
<p>{{ userComment }}</p>
<img [src]="avatarUrl" [alt]="userName">
```

Avoid constructing template strings, compiling user input as a template, assigning untrusted values through `ElementRef.nativeElement.innerHTML`, or using `document.write`, `eval`, or similar DOM APIs. Do not use `bypassSecurityTrustHtml`, `bypassSecurityTrustUrl`, or another `bypassSecurityTrust*` method merely to make a binding work; those methods disable Angular's protection for that value.

If rich HTML is a requirement, sanitize it with a well-maintained allowlist sanitizer and bind the sanitized result to `[innerHTML]`. Validate URLs and resource origins explicitly, especially for links, images, iframes, and user-controlled redirect targets. Keep the sanitizer and Angular dependencies patched, and use HTTPS plus security headers such as a Content Security Policy and, where practical, Trusted Types as defense in depth.

Finally, enforce authorization and input validation on the server. XSS prevention in the client does not replace server-side validation, output encoding in other clients, or protection of APIs and sensitive actions. Test templates and rich-text flows with malicious payloads in a controlled security test suite.


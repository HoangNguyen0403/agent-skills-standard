# Whether to mark HTML as trusted

Usually, no. Angular sanitizes interpolated values and security-sensitive bindings. Treat every `bypassSecurityTrust*` call as a potential XSS vector, because it disables Angular's normal safety checks for that context.

For untrusted or user-generated HTML, either render it as text:

```html
<div>{{ content }}</div>
```

or sanitize it explicitly before binding:

```typescript
const safeHtml = sanitizer.sanitize(SecurityContext.HTML, content) ?? '';
```

Do not turn that content into a `SafeHtml` with `bypassSecurityTrustHtml`. Only consider a trust-marking API when the value is controlled and verified—for example, a vetted static CMS fragment with a documented allowlist—and keep the call close to that controlled source so it can be audited. Never trust a value merely because it came from an internal API, database, or administrator without validating its provenance and content. Use the API matching the actual context (`HTML`, URL, style, resource URL), not a generic bypass. Add tests for malicious HTML and URLs, and use a server-configured nonce-based CSP as defense in depth.


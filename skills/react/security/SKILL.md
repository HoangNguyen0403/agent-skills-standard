---
name: React Security
description: Security practices for React (XSS, Auth, Dependencies).
metadata:
  labels: [react, security, xss, auth]
  triggers:
    files: ['**/*.tsx', '**/*.jsx']
    keywords: [dangerouslySetInnerHTML, token, auth, xss]
---

# React Security

## **Priority: P0 (CRITICAL)**

Preventing vulnerabilities in client-side apps.

## Implementation Guidelines

- **XSS**: Avoid `dangerouslySetInnerHTML`. Sanitize via `DOMPurify` if needed.
- **URLs**: Validate `javascript:` protocols in user links.
- **Auth**: Store tokens in `HttpOnly` cookies. Avoid `localStorage`.
- **Deps**: Run `npm audit`. Pin versions.
- **Secrets**: Server-side only. No `.env` secrets in build.
- **CSP**: Strict Content-Security-Policy headers.

## Anti-Patterns

- **No `eval()`**: RCE risk.
- **No Serialized State**: Don't inject JSON into DOM without escaping.
- **No Client Logic for Permissions**: Backend must validate.

## Code

```tsx
import DOMPurify from 'dompurify';

// Safe HTML Injection
function SafeHtml({ content }) {
  const clean = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Bad Link Prevention
const safeUrl = url.startsWith('javascript:') ? '#' : url;
<a href={safeUrl}>Link</a>;
```

## Related Topics

common/security-standards | typescript/security | component-patterns

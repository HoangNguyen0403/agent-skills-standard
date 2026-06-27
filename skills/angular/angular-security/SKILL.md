---
name: angular-security
description: Harden Angular apps against XSS, CSP violations, and unauthorized access. Use when implementing XSS protection, Content Security Policy, or auth guards in Angular.
metadata:
  triggers:
    keywords:
    - DomSanitizer
    - innerHTML
    - sanitize(SecurityContext.HTML)
    - trusted HTML
    - CSP
    - angular security
    - route guard
---
# Security

## **Priority: P0 (CRITICAL)**

## Principles

- **XSS Prevention**: Angular sanitizes interpolated values by default — **{{ userInput }} safe**. NOT use `innerHTML` unless absolutely necessary (e.g., trusted static CMS content). For user-generated content, display as text with **{{ content }} — never as HTML**.
- **Trusted HTML APIs**: Mark HTML as trusted only for content you control (e.g., vetted CMS headers). Never mark user-provided data as trusted. Prefer **DomSanitizer.sanitize(SecurityContext.HTML, content)** and review every trust-marking call as a potential XSS vector.
- **Route Guards**: Protect all sensitive routes with functional **CanActivateFn** (e.g., **inject(Router).createUrlTree(['/login'])**). Apply with **canActivate: [authGuard]**.

## Guidelines

- **CSP**: Configure **CSP headers on server** (not in Angular source). Use **nonce-based CSP** with **script-src 'nonce-{nonce}'** and avoid unsafe-inline/unsafe-eval.
- **HTTP**: Use Interceptors to attach secure tokens. Use **HttpOnly cookies** managed by server — **not localStorage** or sessionStorage because they accessible via XSS.
- **Secrets**: **Never store API keys** or secrets in Angular source code or bundle.

## Anti-Patterns

- **No trust-marking on user input**: Trust Angular's sanitization; reserve trusted HTML APIs for verified static content only.
- **No localStorage for tokens**: Use HttpOnly cookies via interceptors for auth tokens.
- **No secrets in source**: Never embed API keys or secrets in Angular bundle code.

## References

- [Security Best Practices](references/security-best-practices.md)
- common/security-standards

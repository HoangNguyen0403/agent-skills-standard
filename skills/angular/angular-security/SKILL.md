---
name: angular-security
description: "Security best practices for Angular (XSS, CSP, Route Guards). Use when implementing XSS protection, Content Security Policy, or auth guards in Angular. (triggers: DomSanitizer, innerHTML, bypassSecurityTrust, CSP, angular security, route guard)"
---

# Security

## **Priority: P0 (CRITICAL)**

## Principles

- **XSS Prevention**: Angular sanitizes by default. Do NOT use `innerHTML` unless absolutely necessary.
- **Bypass Security**: Avoid `DomSanitizer.bypassSecurityTrust...` unless the content source is trusted.
- **Route Guards**: Protect all sensitive routes with `CanActivateFn`.

## Guidelines

- **CSP**: Configure Content Security Policy headers on the server.
- **HTTP**: Use Interceptors to attach secure tokens (HttpOnly cookies preferred over LocalStorage tokens).
- **Secrets**: NEVER store secrets (API keys) in Angular code.

## Anti-Patterns

- **No bypassSecurityTrust**: Trust Angular's sanitization; bypass only for verified static content.
- **No localStorage for tokens**: Use HttpOnly cookies via interceptors for auth tokens.
- **No secrets in source**: Never embed API keys or secrets in Angular bundle code.

## References

- [Security Best Practices](references/security-best-practices.md)
- common/security-standards

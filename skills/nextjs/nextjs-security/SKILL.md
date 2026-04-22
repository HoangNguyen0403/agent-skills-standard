---
name: nextjs-security
description: Secure Next.js App Router with middleware auth, Server Action validation, CSP headers, and taint APIs. Use when adding authentication middleware, validating Server Action inputs with Zod, or preventing secret leakage to client bundles.
metadata:
  triggers:
    files:
    - 'app/**/actions.ts'
    - 'middleware.ts'
    keywords:
    - action
    - boundary
    - sanitize
    - auth
    - jose
---
# Next.js Security

## **Priority: P0 (CRITICAL)**

## Workflow: Secure Next.js App

1. **Add auth middleware** — Create `middleware.ts` to verify JWT/session on protected routes.
2. **Validate Server Actions** — Parse all inputs with Zod schemas; call `await auth()` first.
3. **Set security headers** — Add CSP, HSTS, X-Frame-Options in middleware response.
4. **Use `server-only`** — Import in modules containing secrets to prevent client bundling.
5. **Taint sensitive objects** — Use `taintObjectReference` to block server objects from reaching client.

## Secure Server Action Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Next.js Middleware**: Use **`middleware.ts`** for edge-side authentication, role-based access control (RBAC), and enforcing **Security Headers** (e.g., **`Content-Security-Policy (CSP)`**, **`X-XSS-Protection`**).
- **Server Actions**: Always **sanitize all inputs** from `FormData` or JSON using **Zod**. Perform **authentication checks** (`await auth()`) inside every action to verify caller.
- **Data Tainting**: Use **`experimental_taint`** API (**`taintObjectReference`**) to ensure sensitive server objects (e.g., User with `passwordHash`) never leak into Client Component.
- **Route Handlers (`route.ts`)**: Implement **rate limiting** to prevent brute-force or DoS attacks. Verify **Origin/Referer headers** to mitigate **CSRF** (Cross-Site Request Forgery).
- **Auth Tokens**: strictly use **`HttpOnly`, `Secure` cookies** with **`SameSite: 'Lax'`** for session management. Never store tokens in `localStorage`.
- **Logic Isolation**: use **`server-only`** package to prevent backend-specific logic from included in client bundle.
- **Component Purity**: **Escape all user-provided content** rendered in components. Never use **`dangerouslySetInnerHTML`** without sanitizer like **`DOMPurify`**.

## Anti-Patterns

- **No leaking DB fields to client**: Use DTOs; never pass raw model objects.
- **No `process.env` in client bundles**: Mark as `NEXT_PUBLIC_` only if safe to expose.
- **No unvalidated Server Action inputs**: Always validate with Zod schema.
- **No auth checks in shared Layouts**: Auth in layouts insecure; use Middleware.

## References

- [Secure App Router Patterns](references/implementation.md)
---
name: nextjs-security
description: 'Core security standards for App Router and Server Actions. Use when securing Next.js App Router routes, Server Actions, or API endpoints. (triggers: app/**/actions.ts, middleware.ts, action, boundary, sanitize, auth, jose)'
---

# Next.js Security

## **Priority: P0 (CRITICAL)**

## Structure

```text
app/
├── lib/
│   └── validation.ts   # Shared Zod schemas
└── middleware.ts       # Auth & Headers
```

## Implementation Guidelines

- **Next.js Middleware**: Use **`middleware.ts`** for edge-side authentication, role-based access control (RBAC), and enforcing **Security Headers** (e.g., **`Content-Security-Policy (CSP)`**, **`X-XSS-Protection`**).
- **Server Actions**: Always **sanitize all inputs** from `FormData` or JSON using **Zod**. Perform **authentication checks** (`await auth()`) inside every action to verify the caller.
- **Data Tainting**: Use the **`experimental_taint`** API (**`taintObjectReference`**) to ensure sensitive server objects (e.g., User with `passwordHash`) never leak into a Client Component.
- **Route Handlers (`route.ts`)**: Implement **rate limiting** to prevent brute-force or DoS attacks. Verify **Origin/Referer headers** to mitigate **CSRF** (Cross-Site Request Forgery).
- **Auth Tokens**: strictly use **`HttpOnly`, `Secure` cookies** with **`SameSite: 'Lax'`** for session management. Never store tokens in `localStorage`.
- **Logic Isolation**: use the **`server-only`** package to prevent backend-specific logic from being included in the client bundle.
- **Component Purity**: **Escape all user-provided content** rendered in components. Never use **`dangerouslySetInnerHTML`** without a sanitizer like **`DOMPurify`**.

## Anti-Patterns

- **No leaking DB fields to client**: Use DTOs; never pass raw model objects.
- **No `process.env` in client bundles**: Mark as `NEXT_PUBLIC_` only if safe to expose.
- **No unvalidated Server Action inputs**: Always validate with Zod schema.
- **No auth checks in shared Layouts**: Auth in layouts is insecure; use Middleware.

## References

- [Secure App Router Patterns](references/implementation.md)

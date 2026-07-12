# Content Security Policy for an Angular app

Set CSP as an HTTP response header on the production web server, reverse proxy, or SSR host—not in Angular source code. Generate a fresh, unpredictable nonce per response and use it for any legitimately inline bootstrap script or style that must remain inline. A restrictive starting policy is:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{per-request-nonce}'; style-src 'self' 'nonce-{per-request-nonce}'; img-src 'self' data: https:; connect-src 'self' https://api.example.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
```

Replace the placeholder with the server-generated nonce; do not use one fixed nonce in source control. Prefer external, same-origin scripts and styles, and do not add `unsafe-inline` or `unsafe-eval` merely to silence violations. Restrict `connect-src`, image sources, frames, fonts, and other resource directives to the origins the app actually needs. If the app uses SSR or inline bootstrapping, ensure the server applies the same per-response nonce to the permitted elements and the header.

Roll the policy out with `Content-Security-Policy-Report-Only` first, collect violation reports, remove unnecessary dependencies, then enforce it. Test production builds, lazy-loaded chunks, API calls, images, and third-party integrations. CSP is defense in depth; it does not replace Angular's contextual sanitization, safe interpolation, input validation, or avoiding `DomSanitizer` trust-bypass APIs.


# Content Security Policy for an Angular app

Set CSP as an HTTP response header, ideally at the web server, reverse proxy, or hosting layer. A header is harder for injected markup to weaken than a policy placed in the document. Start with `Content-Security-Policy-Report-Only`, collect violations, and then enforce a policy after all legitimate scripts, styles, APIs, images, and fonts are accounted for.

A typical starting point is:

```http
Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'nonce-{random-per-response}'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.example.com; img-src 'self' data: https:; font-src 'self'; form-action 'self';
```

Adjust the origins to the application. Do not add `unsafe-eval` unless there is a documented, unavoidable dependency, and avoid broad wildcards. A nonce must be cryptographically random, newly generated for each response, and placed on every script tag that needs to execute. For a static deployment, hashes or a carefully generated build-time policy may be more practical. Use CSP-compatible Angular and third-party dependencies; do not treat a nonce or hash as permission to inject arbitrary code.

The exact policy depends on the Angular version, build output, styles strategy, analytics, fonts, and API hosts. `style-src 'unsafe-inline'` is often needed by Angular component styling, but it weakens the policy; remove it if the application can use nonces, hashes, or an otherwise compatible style setup. Include `report-to` or the older reporting directive if violation telemetry is needed, and review reports for both real breakage and attack attempts.

CSP is defense in depth. It does not replace Angular's contextual escaping and sanitization, safe DOM usage, dependency updates, server-side authorization, or secure cookie and token handling.


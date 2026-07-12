## Recommended activation keywords

Add explicit keyword matches for both the implementation surface and the security concern. Useful terms include:

- `API endpoint`, `API route`, `route handler`, `controller`, `handler`, `REST`, `GraphQL`, `webhook`, `HTTP`, `request`, `response`
- `authentication`, `authorization`, `access control`, `RBAC`, `permissions`, `session`, `token`, `JWT`, `OAuth`, `API key`
- `input validation`, `schema validation`, `sanitization`, `injection`, `SQL injection`, `command injection`, `XSS`, `CSRF`, `SSRF`, `path traversal`
- `rate limiting`, `CORS`, ` security headers`, `TLS`, `secret`, `credential`, `PII`, `audit logging`, `threat model`, `vulnerability`, `secure endpoint`

The matching rule should be case-insensitive and should recognize common variants such as `endpoint`, `endpoints`, `route`, and `routes`. File-pattern matching should also activate the security skill for likely API files—route/controller/handler modules, middleware, authentication modules, schemas, and API tests—while avoiding reliance on keywords alone. The activation test should include a request to add an endpoint and verify that the security skill is loaded before any source edit. A second test should cover an endpoint request with no explicit word such as “security,” because secure-by-default behavior must not depend on the user remembering the keyword.


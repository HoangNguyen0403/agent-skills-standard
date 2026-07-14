# Security hardening

Use supported Spring/dependency versions, scan dependencies and images, remove unused starters, and enforce HTTPS. Validate input, use parameterized queries, encode rendered output, apply least privilege, and use bcrypt/Argon2 for passwords. Keep secrets in a managed store and use appropriate token lifetime and rotation.

Keep CSRF for browser sessions; disable it only for truly stateless bearer-token APIs. Restrict CORS, configure secure headers such as HSTS and CSP where applicable, limit request size/rate, set safe timeouts, and protect actuator, Swagger, admin, and debug endpoints. Return generic errors without stack traces, redact security logs, and test authentication, authorization, tenant isolation, and failure paths.




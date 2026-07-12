High-severity security finding: the endpoint is vulnerable to IDOR/BOLA. Any caller can substitute another user's ID and retrieve that user's data.

Require authentication and enforce authorization for the requested resource on the server. Prefer deriving the user identity from the authenticated principal when appropriate, and return a generic 404/403 for unauthorized access. Add tests covering unauthenticated requests, another user's ID, authorized access, and resource-not-found behavior. Confirm that logs and error responses do not expose sensitive data.

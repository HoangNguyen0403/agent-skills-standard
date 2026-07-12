This is broken object-level authorization (an IDOR). The URL is user-controlled, so hiding the ID or checking permissions only in React is not a defense.

Enforce authorization on every server request using the authenticated principal and requested resource. Scope the lookup to resources the principal may access, for example WHERE id = ? AND owner_id = ?, or perform an equivalent policy check before returning data. Return a consistent 404 when appropriate, log denied attempts, and test horizontal-access cases. The server, not the client, is the security boundary.

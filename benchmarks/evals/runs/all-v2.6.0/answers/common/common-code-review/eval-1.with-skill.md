[BLOCKER] [New user-data endpoint; file/route unspecified] Missing authentication and authorization allows any caller to retrieve another user’s data by changing the URL user ID (IDOR/BOLA).
Why: This is an unauthenticated data-exposure vulnerability that may allow user enumeration and disclosure of private or sensitive information.
Fix: Require authentication, then authorize access to the requested ID based on ownership or an explicit role. Return `401` when unauthenticated and `403` when unauthorized; avoid leaking data in error responses.

Assumption: The endpoint directly trusts the URL user ID and no upstream middleware enforces access control. Evidence needed: the route, controller, middleware configuration, and data-access code.

Check:
- Add tests proving unauthenticated requests fail.
- Add tests proving one authenticated user cannot access another user’s ID.
- Cover edge cases such as nonexistent IDs, malformed IDs, privileged roles, and direct URL enumeration.
- Check that queries use parameter binding and return only fields permitted for the caller.

[BLOCKER] [Endpoint handler] The new user-ID endpoint has no authentication or object-level authorization check.
Why: Any caller can retrieve another user's data by changing the URL user ID, creating an unauthenticated data-disclosure and IDOR risk.
Fix: Require authenticated requests and authorize access to the requested user ID before loading or returning data; add unauthorized and cross-user tests.


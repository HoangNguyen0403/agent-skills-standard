Use a Dio interceptor that catches 401 responses, calls a refresh-token endpoint, stores the new access token, and retries the original request once.

Typical flow:
- Add the access token to every request in `onRequest`.
- In `onError`, if status is 401 and the request has not been retried yet:
  - pause/queue duplicate refresh attempts
  - call refresh API with the refresh token
  - save the new token
  - clone and retry the failed request with the new `Authorization` header
- If refresh fails, clear auth state and force logout.

Important details:
- Prevent infinite retry loops with a retry flag.
- Serialize refresh so multiple 401s do not trigger multiple refresh calls.
- Keep token storage in one place, usually a repository or auth service.
- Exclude login/refresh endpoints from interceptor retry logic.


Handle auth tokens as sensitive credentials:

- Store long-lived tokens in the Keychain, not `UserDefaults`.
- Keep access tokens in memory when possible, and refresh them with a refresh token when they expire.
- Send tokens over HTTPS only, typically in the `Authorization: Bearer <token>` header.
- Centralize token injection in your networking layer so requests stay consistent.
- Detect `401 Unauthorized` responses and trigger a token refresh flow, then retry once if refresh succeeds.
- Avoid logging tokens, embedding them in URLs, or exposing them in error messages.
- Clear tokens on logout and when refresh fails.

Example approach in iOS:

1. Save token securely in Keychain.
2. Read token before building a request.
3. Add it to request headers.
4. If server returns 401, refresh token via auth endpoint.
5. Update stored token and retry the original request.

This keeps token handling secure, consistent, and easier to maintain.


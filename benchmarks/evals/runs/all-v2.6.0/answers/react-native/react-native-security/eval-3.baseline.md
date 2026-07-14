# Auth tokens in deep-link URLs

Yes, it is a security issue. URLs can be exposed through OS link handling, browser history, analytics, crash reports, logs, screenshots, referrer data, and other installed apps. They may also be copied or replayed. Remove the token from the URL and revoke/rotate any token that has already been exposed.

For sign-in/deep-link flows, use Authorization Code with PKCE and a system browser/auth session. Return a short-lived, one-time authorization code or opaque state-bound handoff, exchange it over TLS, and store resulting tokens in Keychain/Keystore. For ordinary app links, pass only a non-sensitive identifier and fetch authorized data after navigation. Validate scheme/host/path, use HTTPS universal/app links where possible, protect against replay, and never log the full URL or token. Enforce scopes, expiry, audience, and authorization on the server; deep-link validation is not a substitute for access control.


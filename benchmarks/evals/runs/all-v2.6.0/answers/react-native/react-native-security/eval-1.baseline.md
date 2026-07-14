# Storing authentication tokens

Do not store access or refresh tokens in plain AsyncStorage, SQLite without protection, logs, URLs, or source-controlled configuration. Use the platform secure storage backed by iOS Keychain and Android Keystore, such as a well-maintained secure-storage library. Restrict what is persisted and use short-lived access tokens with refresh-token rotation/revocation where the backend supports it.

Keep tokens out of Redux persistence and general analytics. Configure HTTPS/TLS, avoid logging request headers, and clear secure storage on logout or account removal. Handle keychain/keystore failures and device lock/biometric policy deliberately. If using OAuth, use Authorization Code with PKCE and a system browser/auth session rather than embedding credentials in a WebView. Treat a mobile app as a public client: secrets embedded in the binary cannot be kept secret, so enforce authorization and token validation server-side.


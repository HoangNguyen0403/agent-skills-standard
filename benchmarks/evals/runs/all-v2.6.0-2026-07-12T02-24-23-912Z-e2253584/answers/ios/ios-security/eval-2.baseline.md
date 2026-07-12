Common iOS security anti-patterns to avoid:

- Storing secrets, tokens, or PII in `UserDefaults`, plist files, source code, or logs
- Hardcoding API keys, encryption keys, or credentials in the app binary
- Using weak or homegrown cryptography instead of Apple/platform crypto APIs
- Skipping Keychain for sensitive data storage
- Trusting client-side checks for authorization or business-critical validation
- Disabling, weakening, or incorrectly implementing TLS certificate validation / pinning
- Sending sensitive data over insecure channels or without proper transport security
- Overly verbose logging that exposes tokens, user data, or internal security state
- Failing to validate input from deep links, web views, pasteboard, or external apps
- Exposing insecure WebView bridges between JavaScript and native code
- Keeping sensitive data in memory longer than necessary or leaving it in screenshots/background snapshots
- Using insecure file storage without data protection classes or correct file permissions
- Not enabling appropriate app transport and runtime protections when needed
- Poor jailbreak / tamper assumptions, such as treating the device as inherently trusted
- Missing backend enforcement, assuming app logic alone can prevent abuse
- Overbroad permissions and data access beyond what the feature actually needs
- Not rotating / expiring tokens or not securely handling session lifecycle
- Failing to protect against reverse engineering, binary inspection, and debug abuse where relevant


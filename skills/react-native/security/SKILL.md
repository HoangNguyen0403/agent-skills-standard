---
name: React Native Security
description: Secure storage, deep linking security, and certificate pinning for mobile apps.
metadata:
  labels: [react-native, security, keychain, secure-storage]
  triggers:
    files: ['**/*.tsx', '**/*.ts']
    keywords:
      [security, keychain, secure-storage, deep-link, certificate-pinning]
---

# React Native Security

## **Priority: P0 (CRITICAL)**

## Secure Storage

- **Keychain/Keystore**: Use `react-native-keychain` for tokens, passwords.
- **Never AsyncStorage**: Not encrypted. Only for non-sensitive data.
- **Biometric Auth**: Use `react-native-biometrics` for Face ID/Touch ID.

## Deep Linking

- **Validate URLs**: Check scheme and host before navigation.
- **Sanitize Params**: Never trust URL params. Validate and sanitize.
- **Token Extraction**: Avoid passing tokens in deep link URLs. Use secure code exchange.

## Network Security

- **HTTPS Only**: Enforce via `NSAppTransportSecurity` (iOS) and `network_security_config.xml` (Android).
- **Certificate Pinning**: Use `react-native-ssl-pinning` for high-security apps (banking, healthcare). **Warning**: Requires app update when certificates rotate.
- **No Secrets in Code**: Use `.env` files with `react-native-config`. Add to `.gitignore`.

## Code Obfuscation

- **Hermes**: Bytecode harder to reverse-engineer.
- **ProGuard/R8**: Enable on Android.
- **Note**: Obfuscation is a deterrent, not protection. Move sensitive logic to backend.

## Data Handling

- **PII Masking**: Mask email/phone in logs and analytics.
- **Clipboard**: Clear sensitive data after paste.
- **Screenshots**: Block on sensitive screens with `react-native-screen-guard`.

## Anti-Patterns

- **No Hardcoded Secrets**: Use environment variables.
- **No Sensitive Logs**: Strip `console.log` in production.
- **No Plain HTTP**: Always use HTTPS.
- **No Client-Side Auth**: Validate on backend.

## Reference & Examples

See [references/keychain-usage.md](references/keychain-usage.md) for Keychain, Biometrics, SSL Pinning, and PII Masking.

## Related Topics

common/security-standards | typescript/security

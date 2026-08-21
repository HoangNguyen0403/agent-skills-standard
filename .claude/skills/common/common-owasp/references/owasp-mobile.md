# OWASP Mobile Top 10 (2024) — Full Detection Signals

## M1: Improper Credential Usage

| Signal | Command |
|---|---|
| Hardcoded API keys (Swift) | `grep -rE "(apiKey\|api_key\|secret)\s*[:=]\s*\"" . --include="*.swift"` |
| Hardcoded API keys (Kotlin/Java) | `grep -rE "(API_KEY\|SECRET)\s*=\s*\"" . --include="*.kt" --include="*.java"` |
| Hardcoded API keys (Dart) | `grep -rE "(apiKey\|secret)\s*[:=]\s*['\"]" . --include="*.dart"` |
| Keys in config files | `grep -A1 -E "(APIKey\|Secret)" . -r --include="*.plist" --include="*.xml"` |

**Fix**: Move credentials to server-side. If client must hold keys, use platform keystore (iOS Keychain, Android Keystore).

## M3: Insecure Authentication/Authorization

| Signal | Description |
|---|---|
| Biometric without server validation | App uses `LAContext` (iOS) or `BiometricPrompt` (Android) but doesn't send biometric result to server |
| Local-only role checks | Role/permission checked in client code but not enforced by API |
| Token without expiry | JWT stored locally without `exp` claim validation |

**Fix**: Always validate auth server-side. Biometric should unlock a server-issued short-lived token.

## M5: Insecure Communication

| Signal | Command |
|---|---|
| Missing cert pinning | No matches for `CertificatePinner`, `ServerTrustPolicy`, `TrustKit`, `ssl_pinning` |
| Cleartext traffic (Android) | `grep "cleartextTrafficPermitted\|usesCleartextTraffic" . -r --include="*.xml"` |
| ATS exceptions (iOS) | `grep -A10 "NSAppTransportSecurity" . -r --include="*.plist"` |
| HTTP URLs (Flutter) | `grep "http://" . -r --include="*.dart" \| grep -v "localhost"` |

**Fix**: Enforce TLS 1.2+. Implement certificate pinning. Remove all ATS exceptions and cleartext allowances.

## M7: Insufficient Binary Protections

| Signal | Command |
|---|---|
| Debuggable build (Android) | `grep "android:debuggable" . -r --include="*.xml"` |
| No obfuscation (Android) | `grep "minifyEnabled\s*false" . -r --include="*.gradle"` |
| No jailbreak detection (iOS) | No matches for `isJailbroken`, `canOpenURL.*cydia` |
| No root detection (Android) | No matches for `RootBeer`, `isRooted`, `SafetyNet` |

**Fix**: Enable R8/ProGuard. Add jailbreak/root detection. Use `android:debuggable=false` in release builds.

## M8: Security Misconfiguration

| Signal | Command |
|---|---|
| Exported components (Android) | `grep 'exported="true"' . -r --include="AndroidManifest.xml"` |
| Backup enabled (Android) | `grep "allowBackup" . -r --include="AndroidManifest.xml"` |
| WebView JS enabled | `grep "setJavaScriptEnabled\|addJavascriptInterface" . -r --include="*.kt" --include="*.java"` |

**Fix**: Set `exported=false` unless intentionally public. Disable `allowBackup`. Restrict WebView JavaScript to trusted content.

## M9: Insecure Data Storage

| Signal | Description |
|---|---|
| Tokens in SharedPreferences | Sensitive data in `getSharedPreferences` without encryption |
| Tokens in UserDefaults | Sensitive data in `UserDefaults` instead of Keychain |
| Tokens in SharedPreferences (Flutter) | Sensitive data in `SharedPreferences` instead of `FlutterSecureStorage` |
| Logs with sensitive data | `print()`, `NSLog()`, `Log.d()` with tokens/passwords |

**Fix**: Use `EncryptedSharedPreferences` (Android), Keychain (iOS), `FlutterSecureStorage` (Flutter). Remove all sensitive data from logs.

## M10: Insufficient Cryptography

| Signal | Description |
|---|---|
| Hardcoded encryption keys | Encryption key defined as string literal in source |
| Deprecated algorithms | DES, RC4, MD5 for hashing, SHA1 for signatures |
| Weak random generation | `java.util.Random` instead of `SecureRandom` |

**Fix**: Use platform-provided cryptographic APIs. Store keys in hardware-backed keystore. Use AES-256-GCM for encryption, SHA-256+ for hashing.

# Mobile Security Audit Commands

## iOS (Swift)

### Insecure Storage
```bash
# Tokens/secrets in UserDefaults (should use Keychain)
grep -rE "UserDefaults\.(set|standard)" . --include="*.swift" | grep -iE "token|password|secret|key"
# Keychain usage (good practice)
grep -rE "(KeychainAccess|SecItemAdd|SecItemCopyMatching)" . --include="*.swift"
```

### Network Security
```bash
# ATS exceptions (allowing HTTP)
grep -A10 "NSAppTransportSecurity" . -r --include="*.plist"
# Certificate pinning
grep -rE "(ServerTrustPolicy|URLSessionDelegate|didReceiveChallenge|TrustKit)" . --include="*.swift"
# HTTP URLs (should be HTTPS)
grep -rE "http://" . --include="*.swift" | grep -v "localhost\|127\.0\.0\.1\|//"
```

### Deep Links & URL Schemes
```bash
# URL scheme registration
grep -A5 "CFBundleURLSchemes" . -r --include="*.plist"
# Universal Links
grep -rE "(userActivity|NSUserActivity|webpageURL)" . --include="*.swift"
```

### Binary Protections
```bash
# Jailbreak detection
grep -rE "(isJailbroken|canOpenURL.*cydia|/Applications/Cydia|/usr/sbin/sshd)" . --include="*.swift"
```

## Android (Kotlin/Java)

### Insecure Storage
```bash
# Tokens/secrets in SharedPreferences (should use EncryptedSharedPreferences or Keystore)
grep -rE "getSharedPreferences|SharedPreferences\.Editor" . --include="*.kt" --include="*.java" | grep -iE "token|password|secret"
# EncryptedSharedPreferences usage (good practice)
grep -rE "EncryptedSharedPreferences|AndroidKeyStore|MasterKey" . --include="*.kt" --include="*.java"
```

### Network Security
```bash
# Cleartext traffic
grep -rE "cleartextTrafficPermitted|usesCleartextTraffic" . --include="*.xml"
# Network security config
find . -name "network_security_config.xml" -exec cat {} \;
# Certificate pinning
grep -rE "(CertificatePinner|TrustManagerFactory|X509TrustManager)" . --include="*.kt" --include="*.java"
```

### Component Security
```bash
# Exported components without permissions
grep -E "exported=\"true\"" . -r --include="AndroidManifest.xml"
# Content providers without read/write permissions
grep -B5 -A5 "provider" . -r --include="AndroidManifest.xml" | grep -E "(exported|permission|grant)"
# Backup allowed
grep "allowBackup" . -r --include="AndroidManifest.xml"
```

### Debug & Build
```bash
# Debug mode
grep "android:debuggable" . -r --include="*.xml"
# ProGuard/R8 obfuscation
grep -rE "(minifyEnabled|proguardFiles|R8)" . --include="*.gradle" --include="*.gradle.kts"
```

### WebView Security
```bash
# JavaScript enabled in WebView
grep -rE "(setJavaScriptEnabled|addJavascriptInterface|evaluateJavascript)" . --include="*.kt" --include="*.java"
# WebView loading user-controlled URLs
grep -rE "loadUrl\(|loadData\(" . --include="*.kt" --include="*.java"
```

## Flutter (Dart)

### Insecure Storage
```bash
# SharedPreferences with sensitive data
grep -rE "SharedPreferences" . --include="*.dart" | grep -iE "token|password|secret|key"
# Secure storage usage (good practice)
grep -rE "FlutterSecureStorage|flutter_secure_storage" . --include="*.dart"
```

### Network Security
```bash
# HTTP without TLS
grep -rE "http://" . --include="*.dart" | grep -v "localhost\|127\.0\.0\.1"
# Certificate pinning
grep -rE "(SecurityContext|badCertificateCallback|ssl_pinning)" . --include="*.dart"
```

### Platform Channel Security
```bash
# Method channels (potential native bridge abuse)
grep -rE "MethodChannel\(|EventChannel\(" . --include="*.dart"
# Check what native methods are exposed
grep -rE "setMethodCallHandler" . --include="*.kt" --include="*.java" --include="*.swift"
```

---
name: android-legacy-security
description: Harden Intent handling, WebView configuration, and FileProvider access in Android apps. Use when securing Intent extras, configuring WebViews, or exposing files via FileProvider.
metadata:
  triggers:
    files:
    - '**/*Activity.kt'
    - '**/*WebView*.kt'
    - 'AndroidManifest.xml'
    keywords:
    - Intent
    - WebView
    - FileProvider
    - javaScriptEnabled
---
# Android Legacy Security Standards

## **Priority: P0**

## 1. Secure Intents and Components

- Set `android:exported="false"` for all internal Activities/Services unless needed for deep links.
- Verify `resolveActivity` before starting implicit intents.
- Treat all incoming Intent extras as untrusted — validate all schema/data types.

See [hardening examples](references/implementation.md) for manifest and component restrictions.

## 2. Lock Down WebViews

- Default to `javaScriptEnabled = false`. Use `WebViewClient` and `WebChromeClient` to restrict navigation.
- Disable `allowFileAccess` and `allowFileAccessFromFileURLs` to prevent local file theft via XSS.
- If using `@JavascriptInterface` (API 17+), strictly limit exposed API surface.

See [hardening examples](references/implementation.md) for WebView lockdown patterns.

## 3. Protect Storage and Files

- **NEVER expose `file://` URIs**. Use `FileProvider` to generate `content://` URIs with temporary permissions.
- Use `EncryptedSharedPreferences` for auth tokens and PII. Never use `MODE_WORLD_READABLE`.
- Use `NetworkSecurityConfig` to disable `cleartextTrafficPermitted` and implement certificate pinning.

## Anti-Patterns

- **No Implicit Intents Internally**: Use explicit intents with component class name.
- **No MODE_WORLD_READABLE**: Never use for SharedPreferences or files.

## References

- [Hardening Examples](references/implementation.md)
---
name: android-legacy-security
description: 'Standards for Intents, WebViews, and FileProvider. Use when securing Intent handling, WebViews, or FileProvider access in Android. (triggers: **/*Activity.kt, **/*WebView*.kt, AndroidManifest.xml, Intent, WebView, FileProvider, javaScriptEnabled)'
---

# Android Legacy Security Standards

## **Priority: P0**

## Implementation Guidelines

### Intents & Components

- **Visibility**: Set **`android:exported="false"`** in the Manifest for all internal Activities/Services unless explicitly needed for deep links or external integration.
- **Intents**: Verify **`resolveActivity`** before starting implicit intents. Use **`LocalBroadcastManager`** (legacy) or **`SharedFlow/StateFlow`** for internal communication.
- **Data**: Treat all incoming **Intent extras as untrusted**. Validate all schema/data types before consumption.

### WebView

- **JS**: Default to **`javaScriptEnabled = false`**. Use **`WebViewClient`** and **`WebChromeClient`** to restrict navigation and origin access.
- **File Access**: Disable **`allowFileAccess`** and **`allowFileAccessFromFileURLs`** to prevent local file theft via XSS.
- **Bridge**: If creating a **`JavascriptInterface`**, use **`@JavascriptInterface`** (API 17+) and strictly limit the exposed API surface.

### Storage & Files

- **File Exposure**: **NEVER expose `file://` URIs**. Use **`FileProvider`** (androidx) to generate **`content://`** URIs with temporary permissions.
- **SharedPreferences**: Use **`EncryptedSharedPreferences`** (Security library) for auth tokens and PII. Never use **`MODE_WORLD_READABLE`** (deprecated/insecure).
- **Network**: Use **`NetworkSecurityConfig`** to disable **`cleartextTrafficPermitted`** (mandatory for API 28+) and implement **SSL Pinning/Certificate Pinning**.

## Anti-Patterns

- **No Implicit Intents Internally**: Use explicit intents with the component class name.
- **No MODE_WORLD_READABLE**: Never use for SharedPreferences or files.

## References

- [Hardening Examples](references/implementation.md)

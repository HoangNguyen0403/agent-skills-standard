---
name: android-legacy-security
description: "Standards for Intents, WebViews, and FileProvider. Use when securing Intent handling, WebViews, or FileProvider access in Android. (triggers: **/*Activity.kt, **/*WebView*.kt, AndroidManifest.xml, Intent, WebView, FileProvider, javaScriptEnabled)"
---

# Android Legacy Security Standards

## **Priority: P0**

## Implementation Guidelines

### Intents

- **Implicit**: Always verify `resolveActivity` before starting.
- **Exported**: Verify `android:exported` logic (as per `security` skill).
- **Data**: Treat all incoming Intent extras as untrusted input.

### WebView

- **JS**: Default to `javaScriptEnabled = false`. Only enable for trusted domains.
- **File Access**: Disable `allowFileAccess` to prevent local file theft via XSS.

### File Exposure

- **FileProvider**: NEVER expose `file://` URIs. Use `FileProvider`.

## Anti-Patterns

- **No Implicit Intents Internally**: Use explicit intents with the component class name.
- **No MODE_WORLD_READABLE**: Never use for SharedPreferences or files.

## References

- [Hardening Examples](references/implementation.md)

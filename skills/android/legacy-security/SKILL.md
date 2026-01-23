---
name: Android Legacy Security
description: Standards for Intents, WebViews, and FileProvider
metadata:
  labels: [android, security, legacy, intents]
  triggers:
    files: ['**/*Activity.kt', '**/*WebView*.kt', 'AndroidManifest.xml']
    keywords: ['Intent', 'WebView', 'FileProvider', 'javaScriptEnabled']
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

- **Implicit Internal**: `**No Implicit for Internal**: Use Explicit Intents (class name).`
- **World Readable**: `**No MODE_WORLD_READABLE**: SharedPreferences/Files.`

## References

- [Hardening Examples](references/implementation.md)

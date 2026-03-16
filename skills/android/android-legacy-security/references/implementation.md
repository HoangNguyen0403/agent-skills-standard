# Legacy Security Implementation

## Implicit Intent Verification

Before sending sensitive data or starting an action via implicit intent:

```kotlin
val intent = Intent(Intent.ACTION_SEND).apply {
    type = "text/plain"
    putExtra(Intent.EXTRA_TEXT, "Sensitive Data")
}

// Verify a receiver exists AND matches expected signature if possible
if (intent.resolveActivity(packageManager) != null) {
    startActivity(intent)
}

// For receiving intents (Deep Links), verifying sender is hard.
// validate input data strictly.
```

## WebView Hardening

```kotlin
webView.settings.apply {
    javaScriptEnabled = false // Only enable if strictly required
    allowFileAccess = false  // Prevent access to local filesystem
    allowContentAccess = false
}
```

## FileProvider Usage

For sharing files, use `FileProvider` (content://) instead of file://.

```xml
<!-- AndroidManifest.xml -->
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.provider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

Do not work around `FileUriExposedException` by disabling the check or continuing to use `Uri.fromFile()`. A `file://` URI exposes a filesystem path and is not an appropriate cross-application sharing mechanism.

Use a narrowly scoped `FileProvider` and grant a temporary read permission:

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

Define only the directory that is intended for sharing; do not use a broad root path:

```xml
<!-- res/xml/file_paths.xml -->
<paths>
    <files-path name="shared_files" path="shared/" />
</paths>
```

Then create a `content://` URI and attach a temporary grant to the outgoing Intent:

```kotlin
val uri = FileProvider.getUriForFile(
    this,
    "${BuildConfig.APPLICATION_ID}.provider",
    file // must be under the configured shared/ directory
)

val shareIntent = Intent(Intent.ACTION_SEND).apply {
    type = "application/octet-stream"
    putExtra(Intent.EXTRA_STREAM, uri)
    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    clipData = ClipData.newRawUri("shared_file", uri)
}

if (shareIntent.resolveActivity(packageManager) != null) {
    startActivity(Intent.createChooser(shareIntent, "Share file"))
}
```

Grant only read access unless the recipient must write, and do not expose tokens or other private files through the configured paths. The provider remains non-exported; the temporary URI permission is what permits the selected external app to read that specific file.


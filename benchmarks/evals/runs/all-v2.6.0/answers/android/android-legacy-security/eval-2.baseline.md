Do not disable the `FileUriExposedException` check and do not continue sharing a `file://` URI. Share a `content://` URI issued by a `FileProvider`, with access granted only for the specific operation.

Declare a non-exported provider with URI permissions:

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

In `res/xml/file_paths.xml`, expose only a narrow, app-controlled directory, for example an app cache subdirectory:

```xml
<paths>
    <cache-path name="shared_files" path="shared/" />
</paths>
```

Create the URI and grant the receiving app temporary read access:

```kotlin
val uri = FileProvider.getUriForFile(this, "${BuildConfig.APPLICATION_ID}.fileprovider", file)
val share = Intent(Intent.ACTION_VIEW).apply {
    setDataAndType(uri, mimeType)
    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    clipData = ClipData.newRawUri("shared file", uri)
}
startActivity(Intent.createChooser(share, "Open file"))
```

Grant write access only when required, and use the correct MIME type. The receiving app must use the granted URI rather than trying to convert it back to a filesystem path. Keep the provider paths narrow, avoid placing secrets in shared files, and remove temporary files when they are no longer needed.


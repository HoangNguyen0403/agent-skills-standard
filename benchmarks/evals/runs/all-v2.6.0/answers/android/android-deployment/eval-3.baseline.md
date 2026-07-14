# Upload the R8/ProGuard mapping file to Play Console

Build the exact release artifact first:

```sh
./gradlew :app:bundleRelease
```

For the usual `app` module, R8 writes the mapping file here:

```text
app/build/outputs/mapping/release/mapping.txt
```

In Play Console, open the app’s App bundle explorer, select the uploaded artifact/version, open its download or assets section, and use the upload action for the deobfuscation (ProGuard/R8 mapping) file. Select `mapping.txt`. Console labels can vary slightly, but the file must be attached to the artifact with the matching version code.

The mapping file is build-specific. Archive the exact file produced by CI with the AAB/APK and upload it after that artifact is uploaded. Do not regenerate a mapping file later and assume it matches; a different build can have different obfuscation mappings. Keep `minifyEnabled`/R8 enabled for the release variant, and upload native debug symbols separately if the app contains native code.

For automated releases, a Play publishing plugin or the Google Play Developer API can upload the same file, but it must target the matching package name and version code and use a service account with the required Play Console permissions. If you use Firebase Crashlytics as well, its mapping upload is a separate integration and does not replace the Play Console upload.


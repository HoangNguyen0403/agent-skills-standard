Build the exact Release artifact with R8 enabled. The build produces the mapping file at:

```text
app/build/outputs/mapping/release/mapping.txt
```

In Play Console, open the matching app release or version in App bundle explorer, go to its downloads/assets area, and upload that `mapping.txt` as the deobfuscation (ProGuard/R8 mapping) file. The mapping must come from the same build/version code as the uploaded APK or App Bundle; keep it archived with the release because a later mapping file cannot de-obfuscate that version. Verify the release’s crash reports after processing to confirm that obfuscated stack frames resolve to source names.


Do not commit the Play Store signing keystore to the repository. In GitHub Actions, the standard approach is to store the keystore and related credentials as GitHub Secrets, reconstruct the file at runtime, use it for the Android signing step, and let it disappear with the runner after the job ends.

Recommended approach:

1. Convert the keystore file to base64 locally.

   That gives you a text-safe representation you can store in a secret.

2. Store these values in GitHub repository or environment secrets:

   - base64-encoded keystore content
   - keystore password
   - key alias
   - key password

3. In the workflow, write the secret back to a file during the job.

4. Generate or populate the signing properties file during CI instead of storing it in git.

5. Point the Android build to those temporary files.

Example pattern:

```yaml
- name: Decode Android keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > android/app/upload-keystore.jks

- name: Create key.properties
  run: |
    cat > android/key.properties <<EOF
    storeFile=app/upload-keystore.jks
    storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
    keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
    EOF
```

Why this is the usual safe baseline:

- The keystore never lives in version control.
- Access can be restricted through GitHub’s secrets and environment protections.
- The file exists only on the temporary runner during the job.
- Rotating credentials is easier than cleaning a secret out of git history.

Good security practices:

- Prefer environment secrets for release workflows so you can add approval gates.
- Restrict signed release builds to protected branches or tagged releases.
- Do not print secret values in logs.
- Avoid uploading the keystore or `key.properties` as build artifacts.
- Rotate the keystore-related secrets if exposure is suspected.

If you want even tighter control, use GitHub Environments with required reviewers, or move signing to a dedicated release workflow so ordinary PR jobs never receive production signing material at all.


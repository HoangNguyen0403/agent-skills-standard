Do not commit the Play Store signing keystore to the repository. In GitHub Actions, the standard pattern is to store the keystore as an encrypted GitHub secret, recreate it during the workflow, and inject the signing passwords through secrets as well.

Recommended approach:

1. Base64-encode the keystore locally.
2. Save the encoded value in GitHub Secrets.
3. Save the alias, store password, and key password as separate GitHub Secrets.
4. In the workflow, decode the secret back into a temporary `.jks` file.
5. Generate a `key.properties` file at runtime or pass signing values through Gradle environment variables.
6. Build the signed app without ever storing credentials in source control.

Example secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

Example GitHub Actions steps:

```yaml
- name: Decode Android keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > android/app/release-keystore.jks

- name: Create key.properties
  run: |
    cat > android/key.properties <<EOF
    storeFile=app/release-keystore.jks
    storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
    keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
    EOF
```

Your Android Gradle config can then read `android/key.properties` during release signing. Typical Flutter projects wire this into `android/app/build.gradle` or `build.gradle.kts`.

Important security practices:

- Never commit `keystore.jks`, `key.properties`, or plaintext passwords.
- Restrict secret access to the workflows and branches that need signing.
- Use environment protection rules for production release workflows.
- Delete temporary signing files after the build if the workflow continues beyond packaging.
- Keep PR workflows unsigned when possible; only sign on protected release branches or tags.

If you want stronger control, store the keystore in a secure external secret manager and fetch it during the workflow, but for most GitHub Actions setups, encrypted GitHub Secrets plus runtime decoding is the standard safe solution.

In short: store the keystore and passwords in GitHub Secrets, reconstruct them only during CI, and keep all signing material out of the repo.


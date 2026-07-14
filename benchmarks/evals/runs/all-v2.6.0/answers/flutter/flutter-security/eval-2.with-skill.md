Use environment-specific configuration, not hardcoded values.

- Store the API base URL per environment via `--dart-define` (for example `API_BASE_URL`), with separate values for staging and production in your CI/CD or build commands.
- Do not embed the API key in Dart source. Inject it the same way (`--dart-define=API_KEY=...`) or load it from a secure backend-managed config flow if possible.
- For highly sensitive keys, prefer moving the secret off-device entirely and have the app obtain short-lived tokens from your backend instead of shipping a permanent key.
- For release builds, also enable obfuscation with `--obfuscate --split-debug-info=./symbols`.

Example:

```bash
flutter build apk \
  --dart-define=API_BASE_URL=https://staging-api.example.com \
  --dart-define=API_KEY=staging_key \
  --obfuscate \
  --split-debug-info=./symbols/staging
```

```bash
flutter build appbundle \
  --dart-define=API_BASE_URL=https://api.example.com \
  --dart-define=API_KEY=prod_key \
  --obfuscate \
  --split-debug-info=./symbols/prod
```

If you need local developer convenience, a `.env`-style setup is acceptable for non-committed local config, but production and staging secrets should still be injected by your build pipeline and never committed to the repo.


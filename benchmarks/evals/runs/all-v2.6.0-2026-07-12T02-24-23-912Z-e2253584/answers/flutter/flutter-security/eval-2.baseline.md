Use separate configuration per environment and never hardcode secrets in the app.

For the base URL:
- keep staging and production URLs in environment-specific build config
- in Flutter, common options are `--dart-define`, flavors, or CI-injected config files
- select the correct value at build/release time, not by manual code edits

For the API key:
- do not ship sensitive server-side keys in the mobile client if you can avoid it
- prefer calling your backend, and let the backend hold the real secret
- if the client must use a public/mobile key, store separate staging and production values in your secret manager/CI and inject them per build

Recommended setup:
- staging: injected from staging CI secrets and staging base URL
- production: injected from production CI secrets and production base URL
- keep `.env` or config files out of git unless they contain only non-secret placeholders
- rotate compromised keys and restrict them by app, API scope, and environment


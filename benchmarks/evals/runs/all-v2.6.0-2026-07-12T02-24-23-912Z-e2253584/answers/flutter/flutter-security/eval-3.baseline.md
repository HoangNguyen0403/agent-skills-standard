Before a Play Store release build, I’d cover the basics in four areas:

- Signing and secrets
  - Use a dedicated release keystore, not a debug key.
  - Store keystore files and passwords outside the repo.
  - Load secrets from secure CI/CD environment variables or secret storage.
  - Restrict who can access signing credentials.

- Build configuration
  - Make sure it’s a true release build with debug logging, debug banners, and test endpoints disabled.
  - Enable code shrinking/obfuscation where appropriate.
  - Remove unused permissions from AndroidManifest.
  - Disable cleartext traffic unless it’s explicitly required.

- App and data protection
  - Verify API keys, tokens, and service credentials are not hardcoded in the app.
  - Move sensitive logic and secrets server-side when possible.
  - Use HTTPS for all network traffic.
  - Confirm local storage does not expose sensitive user data.

- Validation before publishing
  - Test the signed release artifact, not just debug builds.
  - Review the final app permissions and network behavior.
  - Scan dependencies for known vulnerabilities and update risky packages.
  - Check Play App Signing, Play Integrity, and store security settings are configured correctly.

In short: protect signing keys, strip debug behavior, avoid shipping secrets, lock down network/storage, and validate the actual signed release build before submission.


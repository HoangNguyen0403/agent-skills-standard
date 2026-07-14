# Automating iOS and Android builds

Put builds in CI and make them reproducible from a clean checkout. A typical pipeline is:

1. Install the pinned Node/package-manager and Java/Xcode/Android toolchain versions.
2. Install dependencies with a lockfile and run lint, TypeScript checks, unit tests, and native build checks.
3. Select the intended environment and increment or validate the platform version/build number.
4. Build Android (APK/AAB) and iOS (archive/IPA) using protected signing credentials.
5. Upload artifacts to internal testing, TestFlight/Play tracks, or the chosen release service.

Expo apps can use EAS Build and EAS Submit; bare apps can use Fastlane, Gradle, and Xcodebuild, often through a CI provider. Store certificates, provisioning profiles, keystores, and API tokens in CI secret storage, not in git or logs. Cache dependencies carefully, record commit SHA and environment metadata, use separate workflows for PR validation and release, and add manual approval for production. Test the produced artifacts on representative devices before rollout and keep a rollback path.


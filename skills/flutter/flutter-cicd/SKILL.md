---
name: flutter-cicd
description: "Continuous Integration and Deployment standards for Flutter apps. Use when setting up CI/CD pipelines, automated testing, or deployment workflows for Flutter. (triggers: .github/workflows/**.yml, fastlane/**, android/fastlane/**, ios/fastlane/**, ci, cd, pipeline, build, deploy, release, action, workflow)"
---

# CI/CD Standards

## **Priority: P1 (HIGH)**

Automates code quality checks, testing, and deployment to prevent regressions and accelerate delivery.

## Core Pipeline Steps

1. **Environment Setup**: Use stable Flutter channel. Cache dependencies (pub, gradle, cocoapods).
2. **Static Analysis**: Enforce `flutter analyze` and `dart format`. Fail on any warning in strict mode.
3. **Testing**: Run unit, widget, and integration tests. Upload coverage reports (e.g., Codecov).
4. **Build**:
   - **Android**: Build App Bundle (`.aab`) for Play Store.
   - **iOS**: Sign and build `.ipa` (requires macOS runner).
5. **Deployment** (CD): Automated upload to TestFlight/Play Console using standard tools (Fastlane, Codemagic).

## Best Practices

- **Timeout Limits**: Always set `timeout-minutes` (e.g., 30m) to save costs on hung jobs.
- **Fail Fast**: Run Analyze/Format _before_ Tests/Builds.
- **Secrets**: Never commit keys. Use GitHub Secrets or secure vaults for `keystore.jks` and `.p8` certs.
- **Versioning**: Automate version bumping based on git tags or semantic version scripts.

## Reference

- [**GitHub Actions Template**](references/github-actions.md) - Standard workflow file.
- [**Advanced Large-Scale Workflow**](references/advanced-workflow.md) - Parallel jobs, Caching, Strict Mode.
- [**Fastlane Standards**](references/fastlane.md) - Automated Signing & Deployment.

## Anti-Patterns

- ❌ Committing `keystore.jks`, `.p8`, or `.env` files — store all signing credentials in GitHub Secrets or a secure vault
- ❌ CI job without `timeout-minutes` — hung jobs burn runner minutes; always set an explicit timeout (e.g., 30m)
- ❌ Manual `version: 1.0.0+42` edits in `pubspec.yaml` — automate via git tags or a version script to prevent human error
- ❌ Running `flutter analyze` after `flutter build` — analysis is cheap and fast; fail fast by running it before builds/tests

## Related Topics

flutter/testing | dart/tooling


---
name: ios-deployment
description: "Standards for Provisioning, Signing, and Fastlane. Use when provisioning iOS apps, managing code signing, or automating deployments with Fastlane. (triggers: Fastfile, Appfile, Matchfile, ios_bundle_id, provisioning_profile, testflight)"
---

# iOS Deployment Standards

## **Priority: P1**

## Implementation Guidelines

### Signing & Provisioning

- **Match**: Use `fastlane match` for centralized certificate and profile management. Avoid manual signing where possible.
- **Project Settings**: Explicitly set `PROVISIONING_PROFILE_SPECIFIER` in build settings if using manual/CI.

### CI/CD (Fastlane)

- **Fastfile**: Script your build, test, and release flows. Use lanes for `beta` (TestFlight) and `release` (App Store).
- **Versioning**: Automate build number increments using `increment_build_number`.

### TestFlight

- **Internal Testers**: Automate uploads to TestFlight for every successful merge to the staging branch.
- **Export Compliance**: Automate the export compliance setting in `Info.plist` or Fastlane to avoid metadata pauses.

## Anti-Patterns

- **Manual Signing on CI**: `**No manual identities on CI**: Use Match.`
- **Check-in Certificates**: `**No Certs in Repo**: Use a private git repo for Match certificates.`
- **Hardcoded Versioning**: `**No manual version bumps**: Use Fastlane increment tools.`

## References

- [Fastlane & Signing Setup](references/implementation.md)

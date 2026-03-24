---
name: ios-deployment
description: "Automate provisioning, signing, and deployment with Fastlane. Use when provisioning iOS apps, managing code signing, or automating deployments with Fastlane. (triggers: Fastfile, Appfile, Matchfile, ios_bundle_id, provisioning_profile, testflight)"
---

# iOS Deployment

## **Priority: P1**

## Implementation Workflow

1. **Set up Match** — Use `fastlane match` for centralized certificate and profile management. Avoid manual signing.
2. **Configure build settings** — Set `PROVISIONING_PROFILE_SPECIFIER` explicitly if using manual/CI signing.
3. **Script Fastlane lanes** — Create `beta` (TestFlight) and `release` (App Store) lanes in your Fastfile.
4. **Automate versioning** — Use `increment_build_number` to auto-bump build numbers.
5. **Automate TestFlight uploads** — Trigger on every successful merge to staging.
6. **Set export compliance** — Automate in `Info.plist` or Fastlane to avoid metadata pauses.

### Fastfile Beta Lane Example

```ruby
lane :beta do
  match(type: "appstore")
  increment_build_number
  build_app(scheme: "MyApp")
  upload_to_testflight(
    skip_waiting_for_build_processing: true
  )
end
```

### Match Setup

```ruby
# Matchfile
git_url("https://github.com/org/certificates")
type("appstore")
app_identifier("com.example.myapp")
```

## Anti-Patterns

- ❌ Manual identities on CI — use Match for automated certificate management
- ❌ Certificates committed to repo — use a private git repo for Match certificates
- ❌ Manual version bumps — use Fastlane `increment_build_number`

## References

- [Fastlane & Signing Setup](references/implementation.md)

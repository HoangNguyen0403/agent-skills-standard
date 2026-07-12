# OTA updates

An OTA update can safely deliver JavaScript and bundled assets, but it cannot change native code, native dependencies, entitlements, permissions, or the binary’s supported runtime. Use a service compatible with the app’s runtime, such as Expo Updates/EAS Update for Expo projects or a maintained CodePush-compatible solution where appropriate.

Publish updates to channels/branches that match a specific binary runtime version. At build time, embed the update URL and signing configuration; at runtime, check/download/apply updates according to a policy rather than forcing a disruptive restart. Use code signing, HTTPS, access controls, staged rollout, release metadata, crash monitoring, and rollback capability. Keep migrations backward-compatible because an older binary may receive the new bundle.

For native changes, build and distribute a new iOS/Android binary through the stores or an enterprise/internal channel. Test update compatibility on both platforms, including interrupted downloads, offline startup, rollback, and a user’s current auth/session state. Never use OTA to bypass store review for changes that affect native behavior or platform policy.


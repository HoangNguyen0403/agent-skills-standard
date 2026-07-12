Common iOS deployment anti-patterns to avoid:

- Manual CI signing instead of centralized signing management. Prefer `fastlane match`.
- Storing certificates or provisioning profiles directly in the app repo.
- Manual version/build number bumps instead of automating them with Fastlane, such as `increment_build_number`.
- Skipping explicit signing/build configuration in CI, for example not setting `PROVISIONING_PROFILE_SPECIFIER` when manual or CI signing is required.
- Shipping without scripted deployment lanes. Define clear Fastlane lanes like `beta` for TestFlight and `release` for App Store delivery.
- Treating TestFlight uploads as a manual release step instead of automating them after successful staging merges.
- Forgetting export-compliance metadata, which can delay App Store processing.
- Relying on one-off local machine setup rather than repeatable deployment automation.


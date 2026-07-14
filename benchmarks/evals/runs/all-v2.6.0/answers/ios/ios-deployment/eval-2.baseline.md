Common anti-patterns to avoid in iOS deployment include:

- Manual signing and provisioning setup that is not reproducible across machines
- Keeping certificates, profiles, or API keys in source control
- Releasing directly from a developer laptop without a consistent CI/CD pipeline
- Skipping archive validation, symbol generation, or crash-reporting setup
- Using ad hoc build settings that differ between debug, staging, and production
- Not versioning build numbers and app versions consistently
- Shipping without rollback, phased release, or monitoring plans
- Relying on one person’s Apple account access as a deployment bottleneck
- Failing to test release builds on real devices before submission
- Ignoring App Store compliance checks until the last minute

In general, avoid anything that makes releases manual, opaque, or dependent on tribal knowledge.


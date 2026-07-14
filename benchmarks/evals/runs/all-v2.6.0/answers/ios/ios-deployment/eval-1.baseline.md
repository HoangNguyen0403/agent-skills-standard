Use a repeatable release pipeline:

- Build with a dedicated Release configuration and environment-specific settings.
- Keep signing assets and secrets out of source control; manage certificates, provisioning profiles, and App Store credentials securely.
- Automate versioning, build numbering, archiving, and App Store/TestFlight upload with CI.
- Validate dependencies, bundle identifiers, entitlements, and capabilities before release builds.
- Run pre-release quality gates: unit/UI tests, linting, archive validation, and smoke testing on real devices.
- Ship first to TestFlight, collect crash/analytics signals, then promote to production.
- Maintain rollback and hotfix readiness with tagged releases and reproducible builds.
- Document the deployment checklist so releases do not depend on tribal knowledge.


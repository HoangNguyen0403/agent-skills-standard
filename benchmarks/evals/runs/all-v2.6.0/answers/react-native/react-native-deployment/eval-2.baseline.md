# Development, staging, and production environments

Define an explicit environment configuration contract and select it at build time. Keep non-secret values such as API base URLs, app names, feature flags, and bundle identifiers in environment-specific configuration; keep secrets out of the JavaScript bundle and repository, using a CI secret store or backend instead.

Use separate native identifiers, signing credentials, Firebase/Google service files, URL schemes, and backend projects where isolation matters. Expo projects commonly use EAS build profiles and environment variables; bare projects can use product flavors/build types on Android and schemes/configurations on iOS. Make the selected environment visible in diagnostics and prevent production builds from accidentally using development endpoints.

Validate configuration at startup with a typed schema, fail fast on missing or invalid values, and avoid branching throughout UI code. Use CI to build each profile from a clean checkout, restrict who can publish production builds, and test staging against production-like services. Treat runtime remote flags as a controlled supplement, not a replacement for native/build-time configuration.


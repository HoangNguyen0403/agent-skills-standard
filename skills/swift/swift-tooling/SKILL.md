---
name: swift-tooling
description: Configure SPM packages, SwiftLint, and build settings for Swift projects. Use when managing Swift packages with SPM, configuring build settings, or enforcing Swift code quality.
metadata:
  triggers:
    files:
    - 'Package.swift'
    - '.swiftlint.yml'
    keywords:
    - package
    - target
    - dependency
---
# Swift Tooling Standards

## **Priority: P0**

## Define SPM Packages

- **Package.swift**: Define clear targets, products, and dependencies.
- **Modularization**: Break large projects into local packages for faster builds.
- **Versioning**: Use semantic versioning (Major.Minor.Patch) for shared packages.

See [implementation examples](references/implementation.md) for Package.swift structure, SwiftLint config, and environment-specific code.

## Enforce Code Quality

- **SwiftLint**: Use for consistent style enforcement. Create `.swiftlint.yml` in project root with `disabled_rules` and `opt_in_rules` sections.
- **Compiler Warnings**: Treat warnings as errors in CI to maintain code health.
- **Documentation**: Use triple slashes `///` for documentation comments on public APIs (DocC-compatible).

## Manage Build Configurations

- **Xcconfig**: Use external configuration files to manage build settings.
- **Environment Flags**: Use `#if DEBUG` for development-only code, closed with `#endif`.
- **Schemes**: Maintain separate schemes for Development, Staging, and Production.

## Anti-Patterns

- **No API keys in code**: Use environment variables or build configs.
- **No // swiftlint:disable**: Fix underlying issue.
- **No manually added frameworks**: Use SPM.

## References

- [SPM Setup & Build Configs](references/implementation.md)
---
name: swift-tooling
description: "Standards for SPM, Build Configs, and Code Quality. Use when managing Swift packages with SPM, configuring build settings, or enforcing Swift code quality. (triggers: Package.swift, .swiftlint.yml, package, target, dependency)"
---

# Swift Tooling Standards

## **Priority: P0**

## Implementation Guidelines

### Swift Package Manager (SPM)

- **Package.swift**: Define clear targets, products, and dependencies.
- **Modularization**: Break large projects into local packages for faster builds.
- **Versioning**: Use semantic versioning (Major.Minor.Patch) for shared packages.

### Code Quality

- **SwiftLint**: Use for consistent style enforcement. Adhere to project-wide `.swiftlint.yml`.
- **Compiler Warnings**: Treat warnings as errors in CI to maintain code health.
- **Documentation**: Use DocC-style comments (`///`) for public APIs.

### Build Configurations

- **Xcconfig**: Use external configuration files to manage build settings.
- **Environment Flags**: Use `#if DEBUG` for development-only code.
- **Schemes**: Maintain separate schemes for Development, Staging, and Production.

## Anti-Patterns

- **Hardcoded Secrets**: `**No API keys in code**: Use environment variables or build configs.`
- **Ignoring Lint Errors**: `**No // swiftlint:disable**: Fix the underlying issue.`
- **Manual Dependency Copying**: `**No manually added frameworks**: Use SPM.`

## References

- [SPM Setup & Build Configs](references/implementation.md)

---
name: iOS Dependency Injection
description: Standards for Protocol-based DI, Property Wrappers, and Factory/Needle.
metadata:
  labels: [ios, di, dependency-injection, injection, modularity]
  triggers:
    files: ['**/*.swift']
    keywords: [@Injected, Resolver, Container, Swinject, register, resolve]
---

# iOS Dependency Injection Standards

## **Priority: P0**

## Implementation Guidelines

### Protocol-Based DI (Manual)

- **Initializer Injection**: Preferred method. Pass dependencies through `init`.
- **Abstractions**: Inject protocols instead of concrete classes to facilitate testing (Mocks/Stubs).

### Modern Property Wrappers (Factory/Resolver)

- **Factory**: Use the `Factory` library for lightweight, type-safe navigation-friendly DI.
- **Swinject**: Use for enterprise-grade container-based DI in large modular projects.
- **Injected**: Use `@Injected` property wrappers for cleaner syntax in ViewModels.

### Scoping

- **Singleton**: Use for app-wide services (Auth, Network, Database).
- **Unique/Transient**: Default for ViewModels and temporary workers.
- **Graph/Cached**: Use for shared data within a specific feature flow (Coordinator scope).

## Anti-Patterns

- **Singletitis**: `**No global Shared singleton access everywhere**: Inject the service via initializer.`
- **Service Locator**: `**No Resolver.resolve() inside logic**: Pass dependency via constructor or property wrapper.`
- **Concrete Dependency**: `**No direct class instantiation**: Depend on protocols for testability.`

## References

- [Manual & Library DI Setup](references/implementation.md)

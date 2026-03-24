---
name: ios-dependency-injection
description: "Configure protocol-based DI with property wrappers and Factory/Swinject. Use when setting up dependency injection or factory patterns in iOS. (triggers: **/*.swift, @Injected, Resolver, Container, Swinject, register, resolve)"
---

# iOS Dependency Injection

## **Priority: P0**

## Implementation Workflow

1. **Prefer initializer injection** — Pass dependencies through `init` as the primary approach.
2. **Inject protocols** — Always depend on protocols instead of concrete classes for testability.
3. **Choose a DI library** — Use `Factory` for lightweight DI, `Swinject` for enterprise-grade container-based projects.
4. **Apply correct scoping** — Singleton for app-wide services (Auth, Network); Unique/Transient for ViewModels; Graph/Cached for feature flows.

See [protocol-based DI and Factory registration examples](references/implementation.md)

## Anti-Patterns

- ❌ Global singleton access everywhere — inject services via initializer
- ❌ `Resolver.resolve()` inside business logic — pass dependencies via constructor
- ❌ Direct class instantiation — depend on protocols for testability

## References

- [Manual & Library DI Setup](references/implementation.md)

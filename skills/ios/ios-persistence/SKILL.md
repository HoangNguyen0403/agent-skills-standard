---
name: ios-persistence
description: "Implement local persistence with SwiftData, Core Data, and Keychain. Use when setting up SwiftData models, Core Data stacks, or local persistence in iOS. (triggers: **/*.xcdatamodeld, **/*Model.swift, PersistentContainer, FetchRequest, ManagedObject, Query, ModelContainer, Repository)"
---

# iOS Persistence

## **Priority: P0**

## Implementation Workflow

1. **Choose storage tier** — SwiftData for iOS 17+, Core Data for legacy, Keychain for secrets, UserDefaults for flags only.
2. **Define models** — Use `@Model` macro (SwiftData) or `.xcdatamodeld` (Core Data).
3. **Configure container** — Use `@MainActor` for `ModelContainer` (SwiftData) or `NSPersistentContainer` (Core Data).
4. **Perform background writes** — Use `newBackgroundContext()` (Core Data) to avoid UI lag; never do heavy I/O on `viewContext`.
5. **Secure sensitive data** — Use Keychain for tokens and PII; never store in `UserDefaults`.

See [SwiftData and Core Data implementation examples](references/implementation.md)

## Anti-Patterns

- ❌ Heavy I/O on `viewContext` — use private background contexts
- ❌ String-based predicates — use KeyPaths or generated helpers
- ❌ Missing merge strategy — set `mergePolicy` explicitly (e.g., `mergeByPropertyObjectTrump`)

## References

- [SwiftData & Core Data Implementation](references/implementation.md)

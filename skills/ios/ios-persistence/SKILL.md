---
name: ios-persistence
description: Implement local persistence with SwiftData, Core Data, and Keychain. Use when setting up SwiftData models, Core Data stacks, or local persistence in iOS.
metadata:
  triggers:
    files:
    - '**/*.xcdatamodeld'
    - '**/*Model.swift'
    keywords:
    - PersistentContainer
    - FetchRequest
    - ManagedObject
    - Query
    - ModelContainer
    - Repository
---
# iOS Persistence

## **Priority: P0**

## Implementation Workflow

1. **Choose storage tier** — SwiftData for iOS 17+, Core Data for legacy, Keychain for secrets, UserDefaults for flags only.
2. **Define models** — Use `@Model` macro (SwiftData) or `.xcdatamodeld` (Core Data).
3. **Configure container** — Use `@MainActor` for `ModelContainer` (SwiftData) or `NSPersistentContainer` (Core Data).
4. **Perform background writes** — Use `newBackgroundContext()` (Core Data) to avoid UI lag; never heavy I/O on `viewContext`.
5. **Secure sensitive data** — Use Keychain for tokens and PII; never store in `UserDefaults`.

See [SwiftData and Core Data implementation examples](references/implementation.md)

## Anti-Patterns

- **No Heavy I/O on `viewContext`**: Use private background contexts
- **No String-based Predicates**: Use KeyPaths or generated helpers
- **No Missing Merge Strategy**: Set `mergePolicy` explicitly (e.g., `mergeByPropertyObjectTrump`)

## References

- [SwiftData & Core Data Implementation](references/implementation.md)
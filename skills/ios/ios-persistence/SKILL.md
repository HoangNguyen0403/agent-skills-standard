---
name: ios-persistence
description: 'Standards for SwiftData, Core Data, and Local Storage. Use when implementing SwiftData, Core Data models, or local persistence in iOS. (triggers: **/*.xcdatamodeld, **/*Model.swift, PersistentContainer, FetchRequest, ManagedObject, Query, ModelContainer, Repository)'
---

# iOS Persistence Standards

## **Priority: P0**

## Implementation Guidelines

### SwiftData (Current iOS 17+)

- **Models**: Use the **`@Model`** macro for your Swift classes.
- **Container**: Use **`@MainActor`** for configuring the `ModelContainer`.
- **UI State**: Use **`@Query`** for reactive data fetching in **SwiftUI** views.
- **Context API**: Access `modelContext` from the `@Environment` for CRUD (**modelContext.insert**, **modelContext.delete**, **modelContext.save**).

### Core Data (Stable & Large Legacy)

- **Mapping**: Define your entities and attributes in the **`.xcdatamodeld`** file.
- **Stack**: Use **`NSPersistentContainer`** to encapsulate the SQLite store.
- **Background**: Perform heavy writes on `newBackgroundContext()` to avoid UI lag.
- **Main Context**: Use **`viewContext`** only for UI thread operations.

### Local Persistence (Small Data)

- **Keychain**: Use for **Auth tokens**, passwords, and PII. Never store sensitive keys in `UserDefaults`.
- **UserDefaults**: Use for lightweight settings/flags (e.g., `isDarkModeEnabled`).
- **File System**: Save images or PDFs to the **`Documents`** directory using `Data.write(to:)`.

## Anti-Patterns

- **No heavy I/O on ViewContext**: Use private background contexts.
- **No string-based predicates**: Use KeyPaths or generated helpers.
- **No missing merge strategy**: Set mergePolicy explicitly (e.g., mergeByPropertyObjectTrump).

## References

- [SwiftData & Core Data Implementation](references/implementation.md)

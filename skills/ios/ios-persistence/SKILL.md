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

### SwiftData Example (iOS 17+)

```swift
@Model
class Order {
    var id: String
    var status: String
    var createdAt: Date

    init(id: String, status: String, createdAt: Date) {
        self.id = id
        self.status = status
        self.createdAt = createdAt
    }
}

// In SwiftUI view
struct OrderListView: View {
    @Query(sort: \Order.createdAt, order: .reverse) var orders: [Order]
    @Environment(\.modelContext) private var context

    var body: some View {
        List(orders) { order in
            Text(order.status)
        }
    }
}
```

### Core Data Background Write

```swift
let backgroundContext = persistentContainer.newBackgroundContext()
backgroundContext.perform {
    let order = OrderEntity(context: backgroundContext)
    order.status = "confirmed"
    try? backgroundContext.save()
}
```

## Anti-Patterns

- ❌ Heavy I/O on `viewContext` — use private background contexts
- ❌ String-based predicates — use KeyPaths or generated helpers
- ❌ Missing merge strategy — set `mergePolicy` explicitly (e.g., `mergeByPropertyObjectTrump`)

## References

- [SwiftData & Core Data Implementation](references/implementation.md)

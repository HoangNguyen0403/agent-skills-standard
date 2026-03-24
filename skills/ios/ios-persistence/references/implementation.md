# iOS Persistence Implementation

## Modern SwiftData Setup (iOS 17+)

```swift
import SwiftData

@Model
class Task {
    @Attribute(.unique) var id: UUID
    var title: String
    var isCompleted: Bool

    init(title: String) {
        self.id = UUID()
        self.title = title
        self.isCompleted = false
    }
}

// In App
@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Task.self)
    }
}
```

## Robust Core Data Stack

```swift
class PersistenceController {
    static let shared = PersistenceController()

    let container: NSPersistentContainer

    init() {
        container = NSPersistentContainer(name: "DataModel")
        container.loadPersistentStores { _, error in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error)")
            }
        }
        // POSITIVE: Automatically merges changes from parent/children
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    func performBackgroundTask(_ block: @escaping (NSManagedObjectContext) -> Void) {
        container.performBackgroundTask(block)
    }
}
```

## Batch Deletion Example

```swift
func clearAllData() {
    let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName: "Item")
    let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)

    do {
        try context.execute(deleteRequest)
    } catch {
        // Handle error
    }
}
```

## SwiftData Model and Query (iOS 17+)

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

## Core Data Background Write

```swift
let backgroundContext = persistentContainer.newBackgroundContext()
backgroundContext.perform {
    let order = OrderEntity(context: backgroundContext)
    order.status = "confirmed"
    try? backgroundContext.save()
}
```

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

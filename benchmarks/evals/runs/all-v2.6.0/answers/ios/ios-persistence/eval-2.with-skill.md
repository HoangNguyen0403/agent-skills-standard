Use the container that matches your persistence tier:

- SwiftData on iOS 17+: configure a `ModelContainer` and keep it on the main actor.
- Core Data for older apps: configure an `NSPersistentContainer`.

SwiftData example:

```swift
import SwiftData

@Model
final class Note {
    var title: String

    init(title: String) {
        self.title = title
    }
}

@MainActor
final class PersistenceController {
    let container: ModelContainer

    init(inMemory: Bool = false) throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        container = try ModelContainer(for: Note.self, configurations: config)
    }
}
```

Core Data example:

```swift
import CoreData

final class PersistenceController {
    static let shared = PersistenceController()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "MyModel")

        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }

        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Failed to load store: \(error)")
            }
        }

        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        container.viewContext.automaticallyMergesChangesFromParent = true
    }
}
```

Good defaults:

- Use SwiftData for new iOS 17+ apps.
- Keep SwiftData container setup on `@MainActor`.
- For Core Data, set an explicit merge policy.
- Do heavy writes in a background context with `newBackgroundContext()`, not on `viewContext`.
- Store secrets like tokens in secure storage, not `UserDefaults`.


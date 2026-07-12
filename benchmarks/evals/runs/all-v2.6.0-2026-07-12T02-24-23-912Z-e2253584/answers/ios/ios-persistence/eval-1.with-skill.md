Use the storage tier based on the data:

- SwiftData if you target iOS 17+
- Core Data if you need older iOS support or a mature persistence stack
- Keychain or other secure storage for tokens, credentials, and sensitive PII
- UserDefaults only for tiny simple preferences like flags or onboarding state

For a modern app, I’d default to SwiftData. Define your entities with `@Model`, attach a `ModelContainer` at the app boundary, and read/write through `modelContext`.

```swift
import SwiftData
import SwiftUI

@Model
final class Task {
    @Attribute(.unique) var id: UUID
    var title: String
    var isCompleted: Bool

    init(title: String) {
        self.id = UUID()
        self.title = title
        self.isCompleted = false
    }
}

@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup {
            TaskListView()
        }
        .modelContainer(for: Task.self)
    }
}

struct TaskListView: View {
    @Query(sort: \Task.title) private var tasks: [Task]
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        List(tasks) { task in
            Text(task.title)
        }
    }

    func addTask(title: String) {
        modelContext.insert(Task(title: title))
        try? modelContext.save()
    }
}
```

If you need legacy support, use Core Data with a dedicated persistence controller. Configure `NSPersistentContainer` once, enable automatic merging, and set an explicit merge policy. Heavy writes should run on a background context, not `viewContext`, to avoid UI lag.

```swift
import CoreData

final class PersistenceController {
    static let shared = PersistenceController()

    let container: NSPersistentContainer

    init() {
        container = NSPersistentContainer(name: "DataModel")
        container.loadPersistentStores { _, error in
            if let error = error as NSError? {
                fatalError("Unresolved error: \(error)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    func saveOrderInBackground() {
        let context = container.newBackgroundContext()
        context.perform {
            let order = OrderEntity(context: context)
            order.status = "confirmed"
            try? context.save()
        }
    }
}
```

A solid rule of thumb:

- model data: SwiftData/Core Data
- secrets: Keychain
- booleans and lightweight settings: UserDefaults

Avoid string-based predicates when typed APIs are available, avoid large I/O on the main persistence context, and always define a merge strategy so concurrent updates behave predictably.


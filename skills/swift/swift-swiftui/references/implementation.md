# SwiftUI Implementation

## State Property Wrappers

```swift
// ✅ GOOD: @State for local UI state
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") {
                count += 1
            }
        }
    }
}

// ✅ GOOD: @Binding for child view
struct CounterButton: View {
    @Binding var count: Int

    var body: some View {
        Button("Increment") {
            count += 1
        }
    }
}

// Usage
CounterButton(count: $count) // $ for binding
```

## Observable Objects

```swift
// ✅ GOOD: @StateObject for ownership
class ViewModel: ObservableObject {
    @Published var users: [User] = []

    func loadUsers() async {
        users = try await api.fetchUsers()
    }
}

struct UserListView: View {
    @StateObject private var viewModel = ViewModel()

    var body: some View {
        List(viewModel.users) { user in
            Text(user.name)
        }
        .task {
            await viewModel.loadUsers()
        }
    }
}
```

```swift
// ❌ AVOID: @ObservedObject for owned object
struct UserListView: View {
    @ObservedObject var viewModel = ViewModel() // Re-created on re-render!
}
```

## View Composition

```swift
// ✅ GOOD: Extract subviews
struct ProfileView: View {
    let user: User

    var body: some View {
        VStack {
            ProfileHeader(user: user)
            ProfileDetails(user: user)
        }
    }
}

struct ProfileHeader: View {
    let user: User

    var body: some View {
        HStack {
            AsyncImage(url: user.avatarURL)
            Text(user.name)
                .font(.title)
        }
    }
}
```

## Custom View Modifiers

```swift
// ✅ GOOD: Reusable modifier
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(Color.white)
            .cornerRadius(8)
            .shadow(radius: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}

// Usage
Text("Hello").cardStyle()
```

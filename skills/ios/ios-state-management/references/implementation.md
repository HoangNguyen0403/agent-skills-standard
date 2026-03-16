# iOS State Management Implementation

## Combine ViewModel Pattern

```swift
import Combine

class SearchViewModel: ObservableObject {
    @Published var query: String = ""
    @Published private(set) var results: [String] = []

    private var cancellables = Set<AnyCancellable>()

    init() {
        $query
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] text in
                self?.performSearch(text)
            }
            .store(in: &cancellables)
    }
}
```

## Modern Observation (iOS 17+)

```swift
import Observation

@Observable
class UserProfile {
    var name: String = ""
    var age: Int = 0
}

struct ProfileView: View {
    @Bindable var user: UserProfile

    var body: some View {
        TextField("Name", text: $user.name)
    }
}
```

## PassthroughSubject for Navigation

```swift
class LoginViewModel {
    // Shared event for view to act upon
    let navigationTrigger = PassthroughSubject<Void, Never>()

    func login() {
        // ...
        navigationTrigger.send()
    }
}
```

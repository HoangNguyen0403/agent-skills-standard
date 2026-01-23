# Swift Language Implementation

## Optional Unwrapping Patterns

### Safe Unwrapping

```swift
// ✅ GOOD: Guard for early exit
func process(user: User?) {
    guard let user = user else { return }
    print(user.name)
}

// ✅ GOOD: If-let for scoped usage
if let name = user?.name {
    print("Hello, \(name)")
}

// ✅ GOOD: Nil coalescing
let displayName = user?.name ?? "Guest"
```

```swift
// ❌ AVOID: Force unwrapping
let name = user!.name // Crashes if nil

// ❌ AVOID: Implicitly unwrapped
var user: User! = nil
```

## Protocol-Oriented Programming

```swift
// ✅ GOOD: Protocol + Extension
protocol Identifiable {
    var id: String { get }
}

extension Identifiable {
    func validate() -> Bool {
        return !id.isEmpty
    }
}

struct User: Identifiable {
    let id: String
    let name: String
}
```

## Enums with Associated Values

```swift
// ✅ GOOD: Enum for state
enum LoadingState<T> {
    case idle
    case loading
    case success(T)
    case failure(Error)
}

// ❌ AVOID: Multiple optionals
struct LoadingState {
    var isLoading: Bool?
    var data: Data?
    var error: Error?
}
```

## Generics & Type Constraints

```swift
// ✅ GOOD: Generic with constraints
func findFirst<T: Equatable>(in array: [T], matching item: T) -> Int? {
    return array.firstIndex(of: item)
}

// Protocol with associated type
protocol Container {
    associatedtype Item
    var items: [Item] { get }
}
```

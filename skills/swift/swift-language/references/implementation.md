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

## Sendability and Value Types

Value semantics remove accidental shared mutation; they do not make a type safe to pass across isolation domains by themselves. `Sendable` depends on the stored properties, not on `let` versus `var`.

```swift
// ✅ GOOD: all stored properties Sendable — mutable value-type storage is fine
struct Counter: Sendable {
    var value: Int
}

struct User: Sendable {
    let id: String
    let name: String
}

// ❌ AVOID: a struct wrapping mutable reference state is not automatically Sendable
struct Cache {                       // no Sendable conformance is derivable here
    var storage: NSMutableDictionary   // shared class instance, not Sendable
}
```

A `struct` is `Sendable` when every stored property is `Sendable`; each copy owns its own `var` of a value type. It is not `Sendable` merely because it is a struct: a mutable reference-typed property is shared by every copy. Use `@unchecked Sendable` only with internal locking you can point to in review. Prefer an `actor` for shared mutable state.

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

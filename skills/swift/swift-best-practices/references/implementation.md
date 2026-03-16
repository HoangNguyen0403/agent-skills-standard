# Swift Best Practices Implementation

## Guard for Early Exit

```swift
// ✅ GOOD: Guard pattern
func processPayment(amount: Double?, user: User?) throws {
    guard let amount = amount, amount > 0 else {
        throw PaymentError.invalidAmount
    }
    guard let user = user else {
        throw PaymentError.missingUser
    }

    // Main logic remains flat
    chargeUser(user, amount: amount)
}
```

```swift
// ❌ AVOID: Nested if
func processPayment(amount: Double?, user: User?) throws {
    if let amount = amount {
        if amount > 0 {
            if let user = user {
                chargeUser(user, amount: amount)
            } else {
                throw PaymentError.missingUser
            }
        } else {
            throw PaymentError.invalidAmount
        }
    } else {
        throw PaymentError.invalidAmount
    }
}
```

## for-where Loops

```swift
// ✅ GOOD
for item in items where item.isActive {
    process(item)
}

// ❌ AVOID
for item in items {
    if item.isActive {
        process(item)
    }
}
```

## Value Types & Immutability

```swift
// ✅ GOOD: Immutable struct
struct User {
    let id: String
    let name: String

    func withName(_ newName: String) -> User {
        return User(id: id, name: newName)
    }
}

// ❌ AVOID: Mutable class
class User {
    var id: String
    var name: String
}
```

## Exhaustive Switch

```swift
enum Result {
    case success(Data)
    case failure(Error)
}

// ✅ GOOD
func handle(_ result: Result) {
    switch result {
    case .success(let data):
        process(data)
    case .failure(let error):
        log(error)
    }
}
```

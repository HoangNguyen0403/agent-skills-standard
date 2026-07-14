Protocols define a behavioral contract and support composition; class inheritance reuses implementation through a reference-type hierarchy.

```swift
protocol Payable { func pay() }

struct Invoice: Payable {
    func pay() { /* ... */ }
}

class BaseController { }
final class CheckoutController: BaseController { }
```

Prefer protocol composition and structs for decoupling and value semantics. Use class inheritance when shared reference identity or inherited implementation is genuinely required, and mark classes `final` when they are not designed for subclassing.



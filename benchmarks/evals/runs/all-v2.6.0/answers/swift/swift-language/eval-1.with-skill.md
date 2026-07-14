Use safe optional handling instead of force unwrapping:

```swift
func title(for item: Item?) -> String {
    guard let item else { return "Untitled" }
    return item.title
}

let displayTitle = item?.title ?? "Untitled"
if let item { print(item.title) }
```

Use `guard let` when the value is needed for the remainder of the scope, `if let` for a local branch, and `??` for a default. Avoid `Type!`, `!`, and `as!`; use proper optionals and conditional casts (`as?`).



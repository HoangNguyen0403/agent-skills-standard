Not really — heavy calculations inside `body` are a SwiftUI anti-pattern.

`body` should stay cheap because SwiftUI may recompute it frequently. If you do expensive work there, you can hurt scrolling, animations, and overall UI responsiveness.

Better options:

- Move expensive logic into a view model
- Precompute values before rendering
- Put simple derivations in lightweight computed properties
- Trigger async or one-time work outside `body` when appropriate

Example:

```swift
struct ScoreView: View {
    let scores: [Int]

    private var averageScore: Double {
        scores.isEmpty ? 0 : Double(scores.reduce(0, +)) / Double(scores.count)
    }

    var body: some View {
        Text("Average: \(averageScore)")
    }
}
```

If the calculation is genuinely expensive, move it out of the view entirely:

```swift
@Observable
final class ScoreViewModel {
    var averageScore: Double = 0

    func update(scores: [Int]) {
        averageScore = scores.isEmpty ? 0 : Double(scores.reduce(0, +)) / Double(scores.count)
    }
}
```

Rule of thumb: use `body` for composing UI, not for business logic or costly computation.


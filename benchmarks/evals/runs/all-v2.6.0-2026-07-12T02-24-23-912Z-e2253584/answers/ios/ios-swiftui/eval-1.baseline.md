Use them based on ownership:

- `@State`: for simple value-type state owned by the view itself.
- `@StateObject`: for a reference-type observable object that this view creates and owns for its lifetime.
- `@ObservedObject`: for an observable object created and owned elsewhere, then passed into this view.

For a view model specifically:

- Use `@StateObject` when the view instantiates the view model.
- Use `@ObservedObject` when a parent or dependency container provides it.
- Do not use plain `@State` for a typical class-based view model.

On iOS 17+, if you are using the new Observation system (`@Observable`), you often use:

- `@State` when the view owns the observable model instance
- plain stored property or `let` when the model is passed in

So the old `@StateObject` / `@ObservedObject` split mainly applies to `ObservableObject`; with `@Observable`, ownership is still the key idea, but the property-wrapper rules are simpler.


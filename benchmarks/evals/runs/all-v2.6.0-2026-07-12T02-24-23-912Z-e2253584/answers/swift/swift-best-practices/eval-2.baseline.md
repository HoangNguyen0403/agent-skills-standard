Prefer a `struct` by default. Structures are value types: assigning or passing one gives an independent value, which makes ownership and mutation easier to reason about. They can have methods, properties, protocol conformances, and mutating methods.

Use a `class` when reference identity or shared mutable state matters, when you need inheritance, object lifetime/deinitialization, or Objective-C interoperability. Classes are reference types, so two variables can refer to and mutate the same instance. Choose based on the model's semantics, not on performance assumptions; profile if performance is important.


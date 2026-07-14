Use a `struct` by default for a value with independent state, such as a model or configuration. Copies are independent values, and structs work well with protocol composition.

Use a `class` when instances need identity, shared mutable state, reference semantics, inheritance, deinitialization, or Objective-C interoperability. Assigning a class instance shares the same object.

The choice is semantic rather than a blanket performance rule. If neither identity nor inheritance is needed, a struct usually gives the simpler ownership model; use a class when callers must observe or coordinate changes to one shared instance.


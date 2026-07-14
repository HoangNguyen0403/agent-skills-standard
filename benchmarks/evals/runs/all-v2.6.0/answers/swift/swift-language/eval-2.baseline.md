A protocol defines a set of requirements that structs, enums, and classes can adopt; it supports composition and can provide default implementations in extensions. A type can conform to many protocols.

Class inheritance creates a reference-type subtype relationship. A subclass inherits implementation and identity from one superclass, can override behavior, and participates in class lifetime and dynamic dispatch. It cannot be used by value types.

Use protocols for capabilities and abstractions, and class inheritance only for a genuine “is-a” relationship with shared identity or implementation. A protocol can be class-constrained with `protocol P: AnyObject` when reference semantics are required.


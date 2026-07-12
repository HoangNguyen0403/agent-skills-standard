Some common Go anti-patterns to avoid:

- Ignoring errors or discarding them with `_` when they matter
- Using `panic` for normal control flow instead of returning errors
- Overusing `interface{}`/`any` where concrete types or small interfaces are clearer
- Creating overly large interfaces instead of defining minimal behavior-focused ones
- Writing Java-style class hierarchies instead of simple structs and composition
- Hiding concurrency bugs with goroutines launched without cancellation, error handling, or synchronization
- Causing goroutine leaks by blocking forever on channels or background work
- Sharing mutable state across goroutines without proper synchronization
- Using channels for everything, even where a mutex or plain function call is simpler
- Making packages too tightly coupled or giving them vague responsibilities
- Exporting identifiers unnecessarily and weakening package boundaries
- Putting too much logic into `init()` and creating surprising side effects
- Naming packages or variables redundantly, stutteringly, or unclearly
- Returning concrete implementation details when an interface or simpler API boundary is better
- Writing overly clever code instead of straightforward, idiomatic code
- Premature optimization before measuring with profiling or benchmarks
- Reusing slices or maps unsafely and accidentally depending on shared backing data
- Forgetting that map iteration order is not guaranteed
- Swallowing context propagation in I/O, RPC, or long-running operations
- Building monolithic functions instead of small, testable units

In general, idiomatic Go favors simplicity, explicit error handling, small interfaces, clear ownership, and predictable behavior.


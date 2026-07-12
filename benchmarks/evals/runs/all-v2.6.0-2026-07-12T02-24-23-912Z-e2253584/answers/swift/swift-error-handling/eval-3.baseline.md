Use `throws` for normal synchronous or asynchronous control flow where the caller should handle a failure through Swift's error propagation. It composes naturally through call stacks and works well with `do`/`catch`.

Use `Result<Success, Failure>` when a value representing success or failure must be stored, passed around, or delivered through a callback/API that already models completion as data. It is also useful when both outcomes are manipulated with `map`, `flatMap`, or `get()`.

Do not wrap every throwing function in `Result` unnecessarily. Choose the representation required by the API boundary, and keep the failure type meaningful (`Failure: Error`).


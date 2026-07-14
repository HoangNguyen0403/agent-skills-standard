Avoid these common Go anti-patterns:

- Using `init()` for app setup instead of explicit constructors like `NewService()`
- Relying on global mutable state instead of dependency injection
- Calling `panic` for normal error handling instead of returning `error`
- Ignoring errors with `_` or delaying error handling
- Creating large, broad interfaces instead of small consumer-side interfaces
- Using non-idiomatic naming, like underscores in package names or stuttering names such as `log.LogError`
- Skipping formatting tools like `gofmt` or `goimports`
- Overusing explicit `nil` checks when Go’s zero values already make the code simpler
- Growing slices repeatedly without preallocating when capacity is known


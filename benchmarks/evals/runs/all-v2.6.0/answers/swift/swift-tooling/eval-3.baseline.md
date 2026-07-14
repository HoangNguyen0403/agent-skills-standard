`#if DEBUG` is a compile-time condition used to include debug-only code:

```swift
#if DEBUG
logger.level = .verbose
#endif
```

Xcode normally defines `DEBUG` for a Debug configuration. For custom configurations, add `-D DEBUG` to the Swift Active Compilation Conditions (`SWIFT_ACTIVE_COMPILATION_CONDITIONS`) setting. Use `#elseif` and `#else` for alternatives, and `#if canImport(SomeModule)` for module availability.

This is not a runtime `if`: excluded branches are not compiled. Keep behavior differences small and avoid using debug-only code to bypass production paths that should be tested.


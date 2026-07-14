Wrap development-only code in `#if DEBUG` and close it with `#endif`:

```swift
let endpoint: URL

#if DEBUG
guard let debugEndpoint = URL(string: "http://localhost:8080") else {
    fatalError("Invalid debug endpoint")
}
endpoint = debugEndpoint
#else
guard let productionEndpoint = URL(string: "https://api.example.com") else {
    fatalError("Invalid production endpoint")
}
endpoint = productionEndpoint
#endif
```

Use build configurations or `.xcconfig` files for environment-specific values rather than hardcoding secrets. Keep separate Development, Staging, and Production schemes. In production code, avoid force unwrapping configuration URLs; validate configuration during startup instead.



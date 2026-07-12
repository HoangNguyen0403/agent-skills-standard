For a Swift package, add the dependency in `Package.swift` and declare it on the target that imports it:

```swift
let package = Package(
    name: "MyApp",
    products: [.library(name: "MyApp", targets: ["MyApp"])],
    dependencies: [
        .package(url: "https://github.com/example/Logging.git", from: "1.2.0")
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [.product(name: "Logging", package: "Logging")]
        )
    ]
)
```

Use semantic version requirements, keep products and targets explicit, and run `swift package resolve` or let Xcode resolve packages. For larger codebases, consider local packages to improve modularity and build times.



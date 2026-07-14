For a Swift package, add the package repository and a version requirement to `Package.swift`, then add the product to the target that uses it:

```swift
let package = Package(
    name: "MyApp",
    dependencies: [
        .package(url: "https://github.com/example/Logging.git", from: "1.2.0")
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                .product(name: "Logging", package: "Logging")
            ]
        )
    ]
)
```

Use `from` for compatible minor releases, an exact or range requirement when reproducibility requires tighter control, and commit the resolved versions as appropriate for the project. In Xcode, File > Add Package Dependencies updates the project/package manifest; review the package's products, minimum platform, license, and transitive dependencies.


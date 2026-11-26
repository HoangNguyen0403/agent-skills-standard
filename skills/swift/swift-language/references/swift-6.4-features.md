# Swift 6.4 — Gated Language Features

Reference for projects whose compiler and language mode admit Swift 6.4. The optional `some P?`/`any P?` shorthand is syntax-only — it needs the 6.4 toolchain and no deployment-target bump; library APIs and ownership facilities additionally depend on the SDK and deployment target. Nothing here is a default for an older toolchain.

## Compatibility preflight

Treat these as four separate contracts; a match on one does not imply the others:

1. **Compiler** is a 6.4 release (including Swift toolchain downloads / Xcode build tools).
2. **Language mode** (`-swift-version` 5 or 6) admits the syntax; Swift 6 concurrency checking is a language-mode contract, not a compiler-version side effect. For SwiftPM, **`swift-tools-version` 6.0+ makes Swift 6 language mode the default for the package's targets** — override with `swiftLanguageModes` in the manifest or `.swiftLanguageMode` per target. Bumping tools-version therefore silently enables full concurrency checking. Xcode targets use `SWIFT_VERSION`, not tools-version.
3. **SDK/Xcode** version provides the declarations the syntax needs.
4. **Deployment target**: each added library API has its own availability; syntax availability is not runtime availability. The optional `some P?`/`any P?` shorthand is pure syntax — it needs the 6.4 toolchain, not a deployment-target bump.

## Optional opaque / existential shorthand

Swift 6.4 lets the optional wrapper attach directly to `some`/`any` instead of parenthesizing the protocol type:

```swift
// Swift 6.4+
func makeBadge() -> some View? { … }
func makeRenderer() -> any Renderer? { … }

// Older toolchains: parenthesized form, same intent
func makeBadgeLegacy() -> (some View)? { … }
```

Emit the shorthand only for a 6.4+ compiler; keep the parenthesized form for consumers that may build on older Xcode. Both spell the same optional protocol type — do not present the shorthand as a behavior change.

## Borrow / mutate accessors

Released with 6.4, for concrete ownership or copying problems (avoiding a temporary copy on access). They are an optimization tool, not a style rule:

- Adopt only with a measured copy/allocation problem and a benchmark that shows the improvement.
- Verify the accessor is legal for the storage and that callers keep the same semantics (no observable mutation via `borrow`).
- Do not convert ordinary computed/stored properties wholesale.

## Non-copyable ownership facilities

Non-copyable (`~Copyable`) types predate 6.4; 6.4 extends their ownership and collection support. Adopt them only when the type's lifetime/ownership contract genuinely needs it, and verify the access rules (`borrowing`/`consuming` parameters, deinit of non-copyable types) on the target compiler. Existing value semantics do not imply zero-copy behavior or thread safety.

## Async defer and cancellation shields

6.4 implements [SE-0493](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md) (`async` calls in `defer` bodies) and [SE-0504](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md) (`withTaskCancellationShield(operation:)`):

- Use `defer` with `await` only where cleanup must run asynchronously and the enclosing scope is already `async`.
- A `withTaskCancellationShield` scope keeps cancellation from interrupting the shielded operation; it must not become "ignore cancellation forever". Bound the shielded work and re-check `Task.isCancelled` after it.
- Test the case the audit cares about: cancel the parent, prove shielded cleanup ran, then prove cancellation still propagates afterwards.

## Deferred

- Blanket collection/ownership rewrites, mass adoption of borrow/mutate accessors, or raising language mode for a consumer that has not been through the preflight above.
- Any claim that a 6.4 addition back-deploys to an arbitrary Apple OS version.

## Verification

- Older-toolchain case: a tools-5.9 / Swift 5 module still receives parenthesized optional protocol forms and no 6.4-only syntax.
- 6.4 case: the declared example type-checks with the intended optional protocol type.
- Cancellation case: shielded cleanup completes, then the task still reports cancellation.

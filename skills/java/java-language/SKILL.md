---
name: java-language
description: Modern Java 21+ language standards including Records, Pattern Matching, and Virtual Threads. Use for Java language constructs or Java-to-Java upgrades; defer Kotlin, tests, formatting/build tools, CompletableFuture, builder patterns, and isolated null-handling questions.
metadata:
  triggers:
    files:
    - '**/*.java'
    - 'pom.xml'
    - 'build.gradle'
    keywords:
    - record
    - sealed
    - switch
    - var
    - Optional
    - stream
    - VirtualThread
    - instanceof
    - text block
---
# Java Language Patterns

## **Priority: P0 (CRITICAL)**


## Implementation Guidelines

- **Records**: Use record for immutable DTOs/Value Objects. Records auto-generate equals, hashCode, toString. Avoid Lombok @Data on Pojos.
- **Local Variables**: Use **`var`** for inferred types. Explicitly type interface variables.
- **Switch**: Use Switch Expressions (->) and Pattern Matching over complex if/else chains.
- **Text Blocks**: Use **`"""`** (text blocks, Java 15+) for JSON, SQL, or multi-line strings; the opening `"""` must be followed by a line terminator, and closing-delimiter placement sets incidental indentation.
- **Pattern Matching**: Use **`instanceof`** with pattern binding: `if (obj instanceof String s)`.
- **Sealed Classes**: Use sealed interface/class with permits clause for domain-driven restricted hierarchies. Switch expressions then exhaustive switch (compiler-verified).
- **Collections**: Use **`List.of()`**, **`Map.of()`**, and **`Set.of()`** for immutable collections.
- **Streams**: Use **`stream()`** pipelines for functional transformations. Use **`.toList()`** (Java 16+).
- **Optional**: Utilize **`Optional<T>`** for return types. Use **`.ifPresentOrElse()`** or **`.orElseThrow()`**.
- **Virtual Threads**: Favor **`Executors.newVirtualThreadPerTaskExecutor()`** for I/O-heavy workloads (stable since 21).
- **Preview APIs**: `StructuredTaskScope` and other preview features need an explicit project opt-in, an exact JDK pin, and `--enable-preview` at compile **and** runtime; never present them as a stable default on a JDK where they are still preview. See [concurrency reference](../java-concurrency/references/structured-concurrency.md).

## Anti-Patterns

- **No Nulls**: Return Optional or empty collections; avoid null parameters.
- **No Raw Types**: Always use generics; never use raw List or Map.
- **No Old Switch**: Use switch expressions (->); avoid fall-through.
- **No Manual get/set**: Use Records or value objects instead.
- **No unbounded blocking in monitors**: On JDK 21–23 blocking inside `synchronized` pins the carrier; JDK 24+ ([JEP 491](https://openjdk.org/jeps/491)) removes that. Prefer `ReentrantLock` for timed/try/interruptible locking, not merely to dodge pinning — and do not ban `synchronized` wholesale.

## References

- [Records, Pattern Matching & Virtual Threads](references/example.md)


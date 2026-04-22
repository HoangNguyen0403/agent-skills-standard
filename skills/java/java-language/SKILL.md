---
name: java-language
description: Modern Java 21+ standards including Records, Pattern Matching, and Virtual Threads. Use when working with Java records, sealed classes, switch expressions, text blocks, Optional, or upgrading from older Java versions.
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
- **Text Blocks**: Use **`"" (Text Blocks)`** for JSON, SQL, or multi-line strings.
- **Pattern Matching**: Use **`instanceof`** with pattern binding: `if (obj instanceof String s)`.
- **Sealed Classes**: Use sealed interface/class with permits clause for domain-driven restricted hierarchies. Switch expressions then exhaustive switch (compiler-verified).
- **Collections**: Use **`List.of()`**, **`Map.of()`**, and **`Set.of()`** for immutable collections.
- **Streams**: Use **`stream()`** pipelines for functional transformations. Use **`.toList()`** (Java 16+).
- **Optional**: Utilize **`Optional<T>`** for return types. Use **`.ifPresentOrElse()`** or **`.orElseThrow()`**.
- **Virtual Threads**: Favor **`Executors.newVirtualThreadPerTaskExecutor()`** for I/O-heavy workloads.

## Anti-Patterns

- **No Nulls**: Return Optional or empty collections; avoid null parameters.
- **No Raw Types**: Always use generics; never use raw List or Map.
- **No Old Switch**: Use switch expressions (->); avoid fall-through.
- **No Manual get/set**: Use Records or value objects instead.
- **No synchronized blocks**: Use java.util.concurrent or Virtual Threads instead.

## References

- [Records, Pattern Matching & Virtual Threads](references/example.md)
---
name: java-language
description: "Modern Java 21+ standards including Records, Pattern Matching, and Virtual Threads. Use when working with Java records, sealed classes, switch expressions, text blocks, Optional, or upgrading from older Java versions. (triggers: **/*.java, pom.xml, build.gradle, record, sealed, switch, var, Optional, stream, VirtualThread, instanceof, text block)"
---

# Java Language Patterns

## **Priority: P0 (CRITICAL)**

Modern Java (21+) standards for concise, immutable, and expressive code.

## Implementation Guidelines

- **Records**: Use `record` for DTOs/Value Objects. Avoid Lombok `@Data` where possible.
- **Local Variables**: Use `var` for clear, inferred types. Explicit types for interfaces.
- **Switch**: Use Switch Expressions `->` and Pattern Matching over `if/else` chains.
- **Text Blocks**: Use `"""` for JSON/SQL strings. Avoid concatenation `+`.
- **Pattern Matching**: Use `instanceof` with binding: `if (obj instanceof String s)`.
- **Sealed Classes**: Use `sealed interface/class` for restricted hierarchies (Domain Models).
- **Collections**: Use `List.of()`, `Map.of()`, `Set.of()` for unmodifiable collections.
- **Streams**: Use `stream()` for transformations. Prefer `toList()` (Java 16+).
- **Optional**: Return `Optional<T>` over `null`. Never use `Optional` as a field or parameter.
- **Virtual Threads**: Prefer `Executors.newVirtualThreadPerTaskExecutor()` for I/O.

## Anti-Patterns

- **No Nulls**: Return Optional or empty collections; avoid null parameters.
- **No Raw Types**: Always use generics; never use raw List or Map.
- **No Old Switch**: Use switch expressions (->); avoid fall-through.
- **No Manual get/set**: Use Records or value objects instead.
- **No synchronized blocks**: Use java.util.concurrent or Virtual Threads instead.

## References

- [Records, Pattern Matching & Virtual Threads](references/example.md)

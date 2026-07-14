Yes. If the DTO is an immutable data carrier, use a Java 21 `record`:

```java
public record PersonDto(
    String firstName,
    String lastName,
    int age,
    String email,
    String phone
) {}
```

The compiler generates the canonical constructor, accessors, `equals`, `hashCode`, and `toString`. Accessors are named `firstName()` rather than `getFirstName()`, and record components are final, so setters are not available.

If the DTO must be mutable or requires JavaBean-style `getX`/`setX` methods for a framework, keep a regular class; Java 21 has no built-in replacement for mutable DTO boilerplate. A code-generation library such as Lombok can reduce that boilerplate, subject to your project’s dependency and tooling constraints.


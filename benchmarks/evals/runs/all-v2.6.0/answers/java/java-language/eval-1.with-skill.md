Yes—if the DTO is meant to be an immutable data carrier, use a Java 21 `record`:

```java
public record UserDto(
        String id,
        String name,
        String email,
        String department,
        boolean active
) {}
```

The record provides the canonical constructor, accessors (`id()`, `name()`, etc.), `equals`, `hashCode`, and `toString` automatically. It intentionally has no setters, so use it when the values should not change after construction.

If a framework requires JavaBean-style `getX()` methods, setters, or a mutable no-argument construction flow, keep a regular class (or use a separate mapping class at that boundary).


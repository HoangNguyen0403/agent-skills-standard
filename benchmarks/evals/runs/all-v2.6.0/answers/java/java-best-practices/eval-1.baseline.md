Use a Builder pattern.

With 6 constructor parameters, call sites become hard to read and easy to misuse, especially if several parameters share the same type.

Instead of:

```java
User user = new User("Alice", "alice@example.com", 25, true, "admin", "en");
```

Prefer:

```java
User user = User.builder()
    .name("Alice")
    .email("alice@example.com")
    .age(25)
    .active(true)
    .role("admin")
    .language("en")
    .build();
```

Why this is better:

- improves readability at call sites
- makes parameter meaning explicit
- avoids bugs from wrong argument order
- scales better when optional fields are added

If some fields are mandatory, require them in the builder constructor or validate them in `build()`.


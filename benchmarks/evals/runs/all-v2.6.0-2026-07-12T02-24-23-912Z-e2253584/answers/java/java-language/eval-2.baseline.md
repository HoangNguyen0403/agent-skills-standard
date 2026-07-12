Use pattern matching for `instanceof` (Java 16+), or a pattern-matching `switch` (Java 21+) when the cases are mutually exclusive.

```java
switch (value) {
    case String s  -> handleString(s);
    case Integer i -> handleInteger(i);
    case Path p    -> handlePath(p);
    case User u    -> handleUser(u);
    case null      -> handleNull();
    default        -> handleUnsupported(value);
}
```

This combines the type check and cast, makes the four branches easier to scan, and gives the compiler an opportunity to check that the cases are handled. If you are limited to Java 16–20, use guarded pattern-matching `if` branches instead:

```java
if (value instanceof String s) {
    handleString(s);
} else if (value instanceof Integer i) {
    handleInteger(i);
} else if (value instanceof Path p) {
    handlePath(p);
} else if (value instanceof User u) {
    handleUser(u);
} else {
    handleUnsupported(value);
}
```

For behavior that belongs to the types themselves, polymorphism is often preferable to dispatching on their concrete types. Use a common interface with a method such as `handle()` when you control those classes.


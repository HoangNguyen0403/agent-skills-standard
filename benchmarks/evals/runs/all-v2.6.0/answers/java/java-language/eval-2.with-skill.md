Use Java 21 pattern matching for `switch` instead of an `instanceof` chain:

```java
static void handle(Object value) {
    switch (value) {
        case TypeA a -> a.methodA();
        case TypeB b -> b.methodB();
        case TypeC c -> c.methodC();
        case TypeD d -> d.methodD();
        default -> throw new IllegalArgumentException(
                "Unsupported type: " + value.getClass().getName());
    }
}
```

The pattern variable (`a`, `b`, etc.) is automatically scoped to its matching case, so no explicit cast is needed. If the values belong to a closed domain, model them as a `sealed` interface with the four permitted implementations; then the compiler can verify exhaustiveness and you can omit `default`:

```java
sealed interface Command permits Create, Update, Delete, Read {}

static Result handle(Command command) {
    return switch (command) {
        case Create c -> create(c);
        case Update u -> update(u);
        case Delete d -> delete(d);
        case Read r -> read(r);
    };
}
```

Use an expression-returning `switch` when each branch produces a value, and keep a simple pattern-matching `switch` statement when the branches only perform actions. For nullable input, handle `case null` explicitly or reject null at the boundary.


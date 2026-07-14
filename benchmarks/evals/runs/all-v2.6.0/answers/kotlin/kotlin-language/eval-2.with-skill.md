Replace Java accessor methods with a Kotlin property:

```kotlin
class Person(var name: String)
```

Usage:

```kotlin
val person = Person("Alice")
println(person.name)
person.name = "Bob"
```

Use `val` when the value should be read-only:

```kotlin
class Person(val name: String)
```

For a DTO, prefer a `data class`:

```kotlin
data class Person(var name: String)
```

Kotlin automatically generates JVM-compatible `getName()` and `setName(String)` methods for Java callers. If Java may provide `null`, declare it explicitly:

```kotlin
class Person(var name: String?)
```

Avoid calling `!!`; use safe calls or `?:` when handling nullable values.

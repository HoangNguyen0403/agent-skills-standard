Use a Kotlin property instead of explicit getters and setters:

```kotlin
class Person {
    var name: String = ""
}
```

Usage:

```kotlin
val person = Person()
person.name = "Alice"
println(person.name)
```

For a read-only value, use `val`:

```kotlin
class Person(val name: String)
```

If custom logic is needed, use property accessors:

```kotlin
class Person {
    var name: String = ""
        get() = field.trim()
        set(value) {
            field = value
        }
}
```

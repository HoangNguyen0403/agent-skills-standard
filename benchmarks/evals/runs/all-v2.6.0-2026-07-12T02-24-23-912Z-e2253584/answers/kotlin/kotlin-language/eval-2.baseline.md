Represent the Java bean as a Kotlin property. A mutable Java getter/setter pair normally becomes:

```kotlin
class Person(var name: String)
```

Use `val` when callers should only read it:

```kotlin
class Person(val name: String)
```

Add a custom getter or setter when validation, transformation, or restricted write access is needed, for example `private set`. Kotlin generates Java-compatible accessors for the property. Keep explicit `getName()`/`setName()` methods only when a particular Java API or interoperability constraint requires those exact methods.

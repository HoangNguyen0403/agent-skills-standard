Using `Optional` can be a good idea, but not everywhere.

Returning `Optional<T>` is reasonable when:
- the method may legitimately have no result
- callers should handle that case explicitly

Example:

```java
public Optional<User> findUserById(String id) {
    return Optional.ofNullable(userRepository.findById(id));
}
```

This makes the API clearer than returning `null`, because the absence of a value is part of the method contract.

That said, `Optional` is usually best for return types, not for:
- fields
- method parameters
- places where `null` is required by a framework or legacy API

So your colleague is directionally right: prefer `Optional` over returning `null` when “no result” is a normal outcome and you control the API design.


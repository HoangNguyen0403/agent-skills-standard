Use `weak` when the reference is non-owning and the object may be deallocated first. A weak reference is always optional and is automatically set to `nil` when the object goes away.

Use `unowned` only when the referenced object is guaranteed to outlive the holder or closure. It is non-optional, but accessing it after the object has deallocated traps at runtime. If that lifetime guarantee is not permanent and obvious, use `weak` instead. Avoid `unowned(unsafe)` unless you have a very specific, measured low-level need; it removes safety checks.


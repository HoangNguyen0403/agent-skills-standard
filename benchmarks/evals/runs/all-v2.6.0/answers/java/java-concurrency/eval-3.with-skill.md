Yes — your colleague is right.

With Java virtual threads, blocking I/O is usually fine, but blocking while inside a `synchronized` block is a problem because it can pin the virtual thread to its carrier platform thread. That defeats a big part of the scalability benefit of virtual threads.

Why this matters:

- `synchronized` uses a monitor tied to the OS thread machinery.
- If a virtual thread enters `synchronized` and then performs blocking work, the JVM may be unable to unmount it cleanly.
- The carrier thread stays occupied for the duration of that block.
- Under load, enough pinned carrier threads can reduce throughput and make the app behave more like old thread-per-request code.

So the bad pattern is roughly:

```java
synchronized (lock) {
    callBlockingIO();
}
```

Better options:

- Keep the `synchronized` section tiny and do not perform blocking I/O inside it.
- Move the blocking I/O outside the critical section.
- Prefer `ReentrantLock` when you need explicit locking around code used in virtual-thread-heavy paths.
- Better yet, reduce shared mutable state so less locking is needed at all.

Safer shape:

```java
var result = callBlockingIO();
synchronized (lock) {
    updateSharedState(result);
}
```

Short version: blocking I/O alone is okay for virtual threads; blocking I/O while holding a `synchronized` monitor can pin carrier threads and hurt scalability.


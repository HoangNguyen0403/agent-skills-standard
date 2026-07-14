Yes — in a virtual-thread app, `synchronized` plus blocking I/O can be a problem because `synchronized` pins the virtual thread to its carrier platform thread while the monitor is held.

That matters because virtual threads are cheap only when the JVM can unmount them during blocking operations. If a virtual thread enters a `synchronized` block and then performs blocking I/O, the carrier thread may stay blocked too. Enough of that, and you lose the scalability benefit of virtual threads, since carrier threads become tied up.

Typical effects:

- reduced concurrency
- thread starvation under load
- worse throughput/latency than expected

Safer alternatives:

- avoid blocking I/O while holding a monitor
- keep `synchronized` sections very short
- prefer `ReentrantLock` when appropriate, since it works better with virtual-thread scheduling
- move I/O outside the critical section

So your colleague is right: the issue is not `synchronized` alone, but holding a monitor across blocking work in code running on virtual threads.


Common iOS performance anti-patterns to avoid:

- Doing heavy work on the main thread, like JSON parsing, image decoding, encryption, or large computations.
- Keeping `cellForRowAt` or `cellForItemAt` heavy instead of using lightweight configuration with reusable cells.
- Not using `dequeueReusableCell`, which increases allocation and scrolling cost.
- Relying on uncached remote images in scrolling lists.
- Manually clearing caches aggressively instead of letting the system respond to memory pressure.
- Creating retain cycles, especially in closures, which leads to leaks and memory growth.
- Skipping profiling with Instruments, so leaks, CPU stalls, and persistent allocations go unnoticed.


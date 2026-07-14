Common iOS performance anti-patterns to avoid include:

- Doing heavy work on the main thread, which causes UI jank and dropped frames
- Blocking app launch with too much synchronous initialization
- Excessive view hierarchy depth or unnecessary Auto Layout complexity
- Rebuilding or relayouting views too often without need
- Loading large images without resizing or caching appropriately
- Over-fetching data or making redundant network requests
- Poor collection/table view cell reuse
- Memory leaks or retaining large objects longer than necessary
- Excessive use of timers, polling, or background work that wakes the app too often
- Doing expensive work repeatedly instead of caching, batching, or debouncing
- Unoptimized database or disk access on latency-sensitive paths
- Ignoring Instruments and guessing at bottlenecks instead of measuring


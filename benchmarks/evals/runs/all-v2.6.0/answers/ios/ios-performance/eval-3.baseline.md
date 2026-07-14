A quick-start approach to iOS performance is:

1. Measure first with Instruments:
   - Time Profiler for CPU hotspots
   - Allocations and Leaks for memory growth
   - Core Animation for dropped frames and jank

2. Start with the highest-impact checks:
   - keep main-thread work minimal
   - avoid expensive work in `viewDidLoad`, scrolling callbacks, and layout passes
   - cache reused data and images
   - reduce unnecessary Auto Layout churn

3. Watch common bottlenecks:
   - repeated image decoding/resizing
   - synchronous networking or disk I/O on the main thread
   - excessive cell reconfiguration in lists
   - large object retention causing memory pressure

4. Apply one fix at a time and re-measure to confirm the change actually improved frame time, CPU, or memory.

Minimal example:

```swift
DispatchQueue.global(qos: .userInitiated).async {
    let processed = expensiveProcessing(data)
    DispatchQueue.main.async {
        self.viewModel = processed
        self.tableView.reloadData()
    }
}
```

Rule of thumb: keep UI updates on the main thread, move heavy computation off it, and verify each improvement with profiling rather than intuition.


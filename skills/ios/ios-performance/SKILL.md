---
name: ios-performance
description: "Profile and optimize iOS apps with Instruments, memory management, and rendering techniques. Use when profiling iOS apps with Instruments or optimizing memory and rendering. (triggers: **/*.swift, Instruments, Allocations, Leaks, dequeueReusableCell)"
---

# iOS Performance

## **Priority: P0**

## Implementation Workflow

1. **Profile with Instruments** — Regularly use Allocations and Leaks to detect memory issues. Use Time Profiler for CPU stalls.
2. **Reuse cells** — Always use `dequeueReusableCell` and keep `cellForRowAt` lightweight.
3. **Cache images** — Use `SDWebImage` or `Kingfisher` for remote assets. `AsyncImage` lacks caching for lists.
4. **Offload to background** — Move parsing, encryption, and heavy computation off the Main thread using GCD or Tasks.
5. **Enable strict warnings** — Set `SWIFT_TREAT_WARNINGS_AS_ERRORS` in Release builds.
6. **Run static analysis** — Use Xcode's "Analyze" (Product > Analyze) to catch logic errors.

### Background Processing Example

```swift
// Offload heavy work from Main thread
func processData(_ rawData: Data) async -> [Item] {
    return await Task.detached(priority: .userInitiated) {
        let decoder = JSONDecoder()
        return try decoder.decode([Item].self, from: rawData)
    }.value
}
```

### Cell Reuse Pattern

```swift
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "OrderCell", for: indexPath) as! OrderCell
    cell.configure(with: orders[indexPath.row]) // Keep lightweight
    return cell
}
```

## Anti-Patterns

- ❌ Parsing/processing on Main thread — offload to background using `Task.detached` or GCD
- ❌ Redundant cache clears — let the system handle low-memory via `applicationDidReceiveMemoryWarning`
- ❌ Undetected retain cycles — use Leaks instrument frequently during development

## References

- [Profiling & Optimization](references/implementation.md)

---
name: PHP Concurrency
description: Handling concurrency and non-blocking I/O in modern PHP.
metadata:
  labels: [php, concurrency, fibers, async]
  triggers:
    files: ['**/*.php']
    keywords: [Fiber, suspend, resume, non-blocking, async]
---

# PHP Concurrency

## **Priority: P2 (MEDIUM)**

Standards for cooperative multitasking and non-blocking I/O in modern PHP.

## Implementation Guidelines

- **Fibers (PHP 8.1+)**: Use `Fiber` for low-level cooperative multitasking within a single thread.
- **Cooperative Yielding**: Use `Fiber::suspend()` to yield control and `Fiber::resume()` to continue execution.
- **I/O Bound Focus**: Reserve concurrency for I/O operations (HTTP requests, DB queries). Avoid for CPU-intensive tasks.
- **Event Loops**: For complex async applications, leverage frameworks like **Amp** or **ReactPHP** which abstract Fiber management.
- **Stateless Fibers**: Ensure individual Fibers are self-contained and manage their own state/errors.
- **Incremental Adoption**: Start by offloading a single bottleneck (e.g., concurrent HTTP calls) rather than a full async refactor.

## Anti-Patterns

- **Invisible Concurrency**: Avoid deep Fiber suspensions that make execution flow hard to track.
- **Blocking inside Fiber**: Never perform blocking I/O (e.g., `file_get_contents` on a slow URL) inside a Fiber without a supporting event loop.
- **Manual Scheduler**: Avoid writing your own Fiber scheduler unless building a low-level framework.

## Code

```php
// Concurrent HTTP fetching example (Conceptual)
$fiber = new Fiber(function (string $url): void {
    $data = CustomHttpClient::get($url); // Should call Fiber::suspend() internally
    Fiber::suspend($data);
});

// Main loop control
$fiber->start('https://api.example.com');
while ($fiber->isSuspended()) {
    // Perform other work...
    $result = $fiber->resume();
}
```

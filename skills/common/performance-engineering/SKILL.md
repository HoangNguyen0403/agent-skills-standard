---
name: Performance Engineering Standards
description: Universal standards for high-performance software development across all frameworks.
metadata:
  labels: [performance, optimization, scalability, profiling]
  triggers:
    keywords: [performance, optimize, profile, scalability]
---

# Performance Engineering Standards

Universal standards for high-performance software development across all frameworks.

## **Priority: P1 (OPERATIONAL)**

Universal standards for building high-performance software across all frameworks and languages.

## 🚀 Core Principles

- **Efficiency by Design**: Minimize resource consumption (CPU, Memory, Network) without sacrificing readability.
- **Measure First**: Never optimize without a baseline. Use profiling tools before and after changes.
- **Scalability**: Design systems to handle increased load by optimizing time and space complexity.

## 💾 Resource Management

- **Memory Efficiency**:
  - Avoid memory leaks: explicit cleanup of listeners, observers, and streams.
  - Optimize data structures: use the most efficient collection for the use case (e.g., `Set` for lookups, `List` for iteration).
  - Lazy Initialization: Initialize expensive objects only when needed.
- **CPU Optimization**:
  - Algorithm Complexity: Aim for $O(1)$ or $O(n)$ where possible; avoid $O(n^2)$ in critical paths.
  - Offload Work: Move heavy computations to background threads or workers.
  - Minimize Re-computation: Use memoization for pure, expensive functions.

## 🌐 Network & I/O

- **Payload Reduction**: Use efficient serialization (JSON minification, Protobuf) and compression.
- **Batching**: Group multiple small requests into single bulk operations.
- **Caching Strategy**:
  - Implement multi-level caching (Memory -> Storage -> Network).
  - Use appropriate TTL (Time To Live) and invalidation strategies.
- **Non-blocking I/O**: Always use asynchronous operations for file system and network access.

## ⚡ UI/UX Performance

- **Minimize Main Thread Work**: Keep animations and interactions fluid by keeping the main thread free.
- **Virtualization**: Use lazy loading or virtualization for long lists/large datasets.
- **Tree Shaking**: Ensure build tools remove unused code and dependencies.

## 📊 Monitoring & Testing

- **Benchmarking**: Write micro-benchmarks for performance-critical functions.
- **SLIs/SLOs**: Define Service Level Indicators (latency, throughput) and Objectives.
- **Load Testing**: Test system behavior under peak and stress conditions.

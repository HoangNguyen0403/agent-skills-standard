---
name: angular-performance
description: "Optimization techniques including OnPush, @defer, and Image Optimization. Use when optimizing Angular rendering, deferring blocks, or improving Core Web Vitals. (triggers: ChangeDetectionStrategy.OnPush, @defer, NgOptimizedImage, runOutsideAngular, OnPush)"
---

# Performance

## **Priority: P1 (HIGH)**

## Principles

- **OnPush**: Always use `ChangeDetectionStrategy.OnPush`. Components should only update when Inputs change or Signals fire.
- **Deferrable Views**: Use `@defer` to lazy load heavy components/chunks below the fold.
- **Images**: Use `NgOptimizedImage` (`ngSrc`) for LCP optimization.

## Guidelines

- **Zoneless**: Prepare for Zoneless Angular by avoiding `Zone.runOutsideAngular` hacks. Use Signals.
- **TrackBy**: Always provide a tracking function in loops (`@for (item of items; track item.id)`).

## Anti-Patterns

- **No function calls in template**: Use `computed()` signals or pure pipes to avoid per-cycle re-evaluation.
- **No logic in constructor**: Initialize state in `ngOnInit` or signal effects instead.

## References

- [Defer Usage](references/defer-usage.md)

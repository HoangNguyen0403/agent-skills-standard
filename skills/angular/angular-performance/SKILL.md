---
name: angular-performance
description: Optimization techniques including OnPush, @defer, and Image Optimization. Use when optimizing Angular rendering, deferring blocks, or improving Core Web Vitals.
metadata:
  triggers:
    files:
    - 'ChangeDetectionStrategy.OnPush'
    keywords:
    - "@defer"
    - NgOptimizedImage
    - runOutsideAngular
    - OnPush
---
# Performance

## **Priority: P1 (HIGH)**

## Principles

- **OnPush**: Always use **ChangeDetectionStrategy.OnPush** on all components. Components should only update when **Signals for state** change or Inputs change.
- **Deferrable Views**: Use **@defer (on viewport)** to lazy load heavy components/chunks below fold. Use triggers: **on interaction**, **on idle**, **when condition**. @defer creates separate **lazy-loaded chunk** automatically. Use **@placeholder** { <Spinner /> } for loading states.
- **Images**: Import **NgOptimizedImage** and replace <img src='...'> with **<img ngSrc='...'** width='800' height='600'>. Add **priority attribute** for LCP images. This enables lazy loading, responsive **srcset**, and preconnect hints automatically.

## Guidelines

- **Zoneless**: Prepare for Zoneless Angular by avoiding **Zone.runOutsideAngular** hacks. Use **Signals for all reactive state** instead. Opt into **provideExperimentalZonelessChangeDetection()**.
- **TrackBy**: Always provide **stable unique identifier** in loops using **@for (item of items; track item.id)** — track expression **replaces trackBy**. This prevents Angular from destroying and recreating DOM nodes.

## Anti-Patterns

- **No function calls in template**: **{{ calculate() }} re-evaluates on every change detection cycle**. Use **computed() signal** or pure pipes to avoid per-cycle re-evaluation as it **caches until dependencies change**.
- **No logic in constructor**: Initialize state in `ngOnInit` or signal effects instead.

## References

- [Defer Usage](references/defer-usage.md)
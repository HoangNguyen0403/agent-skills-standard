---
name: system-design-case-catalog
description: "Answer classic system design problems as constraint-to-solution sketches and coach interview practice: URL shortener, rate limiter, news feed, chat, notification, autocomplete, crawler, unique id. Use for interview practice or naming the closest known shape for a new problem."
metadata:
  triggers:
    keywords:
      - system design interview
      - design twitter
      - design url shortener
      - news feed
      - design chat system
      - web crawler
      - mock interview
      - unique id generator
---

# Case Catalog

## **Priority: P2 (MEDIUM)**

Each classic problem has one defining constraint. Name it first; the rest of the design follows.

## Defining Constraints

| Problem | Defining constraint | Decisions that follow |
| --- | --- | --- |
| URL shortener | Read-heavy by ~100:1, key must be short and unique | Base62 of a distributed counter, cache-first read path, 301 vs 302 choice |
| Rate limiter | Decision must be cheap, shared, and correct under concurrency | Token bucket in a shared counter, fail-open or fail-closed rule, `429` plus `Retry-After` |
| News feed | Fan-out cost versus read latency, with celebrity skew | Push for normal accounts, pull for celebrities, hybrid merge at read |
| Chat | Delivery guarantees and presence at persistent-connection scale | WebSocket gateways, per-conversation ordering, offline queue, read receipts |
| Notification | Multi-channel delivery with retries and dedupe | Queue per channel, idempotency key, user preference and quiet hours |
| Autocomplete | Sub-100ms prefix lookup over a huge term space | Trie or prefix index in memory, precomputed top-k per prefix, async rebuild |
| Web crawler | Politeness and dedupe at scale, not raw fetching | Frontier queue per host, robots cache, URL fingerprint dedupe, freshness policy |
| Unique id | Ordered, unique, generated without a central lock | Snowflake-style timestamp plus node plus sequence; clock-skew handling |

## Coaching Mode

- Restate the problem, then ask for scope: which use cases are in, which are out.
- Run the phases from `system-design-methodology`; do not answer with a finished architecture.
- Grade the candidate on: requirements first, numbers before components, one justification per component, awareness of the defining constraint, and honest trade-offs.
- Push on the weakest area with one concrete follow-up question rather than listing every gap.
- Give the model answer only after the candidate commits to an approach.

## Reuse Rules

- Map a new problem to the nearest catalog shape, then re-derive the numbers. The shape transfers, the sizing never does.
- State where the analogy breaks before borrowing the design.
- A catalog answer is a starting hypothesis, not a substitute for intake and estimation.

## Anti-Patterns

- **No pattern-matching without numbers**: a known shape still needs this system's QPS and data volume.
- **No interview answer as a build plan**: production adds migration, cost, compliance, and team constraints.
- **No full solution dump in coaching mode**: the value is in the questions asked, not the answer given.

## References

- [Common Designs](references/common-designs.md) - per-problem sketch with constraints, components, and trade-offs

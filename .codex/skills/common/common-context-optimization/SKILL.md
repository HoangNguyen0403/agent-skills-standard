---
name: common-context-optimization
description: Manage context and prompt-cache costs without losing task state. Use for context management, orchestration cost, token budgets, large tool outputs, cache misses, or long-running conversations.
metadata:
  triggers:
    files:
      - "*.log"
      - "chat-history.json"
    keywords:
      - reduce tokens
      - optimize context
      - summarize history
      - clear output
      - context management
      - prompt-cache
      - prompt caching
      - orchestration cost
---

## **Priority: P1 (HIGH)**

## Workflow

1. **Inspect** host capabilities; do not assume agents can rewrite history, prompts, or memory.
2. **Project outputs** after consuming them: retain decisions, evidence, errors, and required values; point to complete logs/artifacts by stable reference.
3. **Bound context** at host-supported boundaries. Carry goal, active slice, authority, decisions, blockers, evidence links, and next action; preserve a stable append-only prefix where supported.
4. **Compact** only when useful and supported. Keep required details retrievable; never discard source evidence or rely on a fixed turn/token threshold.
5. **Measure** cache reads, replayed input, and total actor cost across the whole task. Separate observed usage from estimates; no invoice, savings, or efficacy claims without evidence.

## Anti-Patterns

- **No history rewrite assumption**: Project outputs or create artifact references; use only host-supported controls.
- **No fixed threshold**: Compact from observed context pressure and task needs, not a universal turn/token count.
- **No evidence deletion**: Keep stable references to source outputs, decisions, and verification.
- **No partial cost claim**: Include cache reads, replay, and total actor cost; label estimates.

## References

- [Compaction](references/compaction.md)
- [Masking and output projection](references/masking.md)
- [Implementation and cost measurement](references/implementation.md)

---
name: common-context-optimization
description: Maximize context window efficiency, reduce latency, and prevent lost-in-middle issues through strategic masking and compaction. Use when token budgets are tight, tool outputs flood the context, conversations drift from intent, or latency spikes from cache misses.
metadata:
  triggers:
    files:
    - '*.log'
    - 'chat-history.json'
    keywords:
    - reduce tokens
    - optimize context
    - summarize history
    - clear output
---
## **Priority: P1 (OPTIMIZATION)**


## 1. Observation Masking (Noise Reduction)

**Problem**: Large tool outputs (logs, JSON lists) flood context and degrade reasoning.
**Solution**: Replace raw output with semantic summaries _after_ consumption.

1. **Identify** outputs exceeding 50 lines or 1 KB.
2. **Extract** critical data points immediately.
3. **Mask** by rewriting history to replace raw data with summary placeholder.
4. **See** `references/masking.md` for patterns.

See [implementation examples](references/implementation.md) for masking patterns.

## 2. Context Compaction (State Preservation)

**Problem**: Long conversations drift from original intent.
**Solution**: Recursive summarization that preserves _State_ over _Dialogue_.

1. **Trigger** compaction every 10 turns or 8k tokens.
2. **Compact**:
 - **Keep**: User Goal, Active Task, Current Errors, Key Decisions.
 - **Drop**: Chat chit-chat, intermediate tool calls, corrected assumptions.
3. **Format**: Update System Prompt or Memory File with compacted state.
4. **See** `references/compaction.md` for algorithms.

See [implementation examples](references/implementation.md) for compacted state format.

## 3. KV-Cache Awareness (Latency)

**Goal**: Maximize pre-fill cache hits.

- **Static Prefix**: Enforce strict ordering — System -> Tools -> RAG -> User.
- **Append-Only**: Never insert into middle of history; append new turns only.

## References

- [Observation Masking Patterns](references/masking.md)
- [Compaction Algorithms](references/compaction.md)

## Anti-Patterns

- **No raw tool dumps**: Mask large outputs immediately after extracting data.
- **No unbounded growth**: Compact every 10 turns to preserve intent over dialogue.
- **No middle insertions**: Append-only history maximizes KV cache hits.
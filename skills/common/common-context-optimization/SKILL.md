---
name: common-context-optimization
description: Reduce context overhead from verbose tool outputs and preserve active task state as context fills through source-side filtering, artifact spill, and runtime-managed compaction. Use when tool outputs are too large or long sessions risk losing task state.
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
## **Priority: P1 (HIGH)**


## 1. Observation Masking & Output Filtering (Noise Reduction)

**Problem**: Large tool outputs (verbose logs, large file reads, JSON dumps) fill context and degrade reasoning.
**Solution**: Filter, truncate, or summarize tool outputs at ingestion.

1. **Filter at source**: Use targeted tools, CLI flags, proxies (`rtk`), grep, line ranges, or specialized selectors to limit output volume before loading into context.
2. **Spill to artifacts**: Write large payloads or logs to external files/artifacts and read only relevant extracts.
3. **Summarize**: Ingest semantic facts and file references into conversation state rather than dumping raw multi-kilobyte output. Do not rely on unsupported history mutation in standard runtimes.
4. **See** `references/masking.md` for patterns.

See [implementation examples](references/implementation.md) for masking patterns.

## 2. Runtime-Managed Compaction (State Preservation)

**Problem**: Long conversations drift from original intent as context fills.
**Solution**: Runtime-managed compaction and state externalization that preserves _State_ over _Dialogue_.

1. **Trigger conditionally**: Trigger compaction when the host runtime indicates context exhaustion or at natural task/slice boundaries. Do not rely on fixed turn counts or hardcoded token limits.
2. **Compact**:
 - **Keep**: User Goal, Active Task, Current Errors, Key Decisions, Artifact Paths.
 - **Drop**: Transient chit-chat, resolved tool failures, verbose intermediate command outputs.
3. **Format**: Externalize compacted state into durable project tracking files (e.g., `progress.md`, task brief, memory file) rather than assuming in-place context rewriting.
4. **See** `references/compaction.md` for algorithms.

See [implementation examples](references/implementation.md) for compacted state format.


## References

- [Observation Masking Patterns](references/masking.md)
- [Compaction Algorithms](references/compaction.md)

## Anti-Patterns

- **No raw tool dumps**: Filter outputs at invocation or spill to artifacts; do not flood context with raw bytes.
- **No fixed-threshold compaction**: Rely on runtime signals and task boundaries, not rigid turn/token counters.
- **No unsupported history mutation**: Standard LLM APIs are append-only; persist state in files rather than assuming retrospective history editing.
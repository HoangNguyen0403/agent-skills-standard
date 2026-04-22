# Observation Masking Patterns

## Strategy: Extract & Collapse

Avoid leaving 500 lines of JSON in context.

### 1. The "Read-Then-Refer" Pattern

**Context State A (Raw)**:

```text
TOOL_OUTPUT: [ ... 200 lines of file listing ... ]
AGENT: I see the file is in /src/utils.
```

**Context State B (Masked)**:

```text
TOOL_OUTPUT: [Artifact: 200 files listed. Found: /src/utils]
AGENT: I see the file is in /src/utils.
```

### 2. Failure Masking

If a tool fails 3 times, collapse the failures into one distinct error block.

**Raw**:

- Fail (Timeout)
- Fail (Timeout)
- Fail (Timeout)

**Masked**:

- System: Tool failed 3x (Timeout). Agent gave up.

## Automation

- Agents should auto-mask outputs > 1000 tokens after the "Turn" is complete.
- Never mask _during_ the reasoning step (you need to see it to understand it).

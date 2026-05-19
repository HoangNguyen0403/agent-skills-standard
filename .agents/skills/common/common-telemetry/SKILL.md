---
name: common-telemetry
description: Enforce tracking of token usage, execution metadata, and cost at the end of agent workflows. Use when a workflow concludes, before generating the final handoff or task.md artifact.
metadata:
  triggers:
    files: []
    keywords:
      - token cost
      - token usage
      - session telemetry
      - cost report
---
# Telemetry & Cost Reporting

## **Priority: P2 (ROUTINE)**

## 1. Finalizing a Workflow

As your final step in any SDLC workflow (or when a user explicitly requests session cost):

1. Call the `get_session_cost` tool provided by the agent-skills-standard MCP server.
2. Calculate the estimated pricing based on the current model's token costs.
3. Append a Markdown table containing the usage metrics to `artifacts/session-cost.md`.

## 2. Telemetry Format

Ensure the `artifacts/session-cost.md` or the output template `## Cost Report` follows this structure:

| Metric | Value |
|---|---|
| **Tool Calls** | [from get_session_cost] |
| **Skills Loaded** | [from get_session_cost] |
| **Prompt Tokens** | [from your platform telemetry] |
| **Completion Tokens** | [from your platform telemetry] |
| **Estimated Cost** | $0.00 |

## Anti-Patterns

- **No skipping the telemetry step**: Always include the Cost Report at the end of the execution if mandated by the workflow.

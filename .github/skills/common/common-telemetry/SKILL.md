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
2. Pass `workflow`, `model`, token counts, cache/reasoning usage, and per-1M token rates when the host runtime exposes them.
3. If token counts are unavailable, report MCP-observed telemetry and mark model-token cost as unavailable.
4. Append a Markdown table containing the usage metrics to `artifacts/session-cost.md`.

## 2. Host Runtime Contract

- This skill defines the telemetry contract; it does not collect provider billing data by itself.
- The host runtime or orchestrator must trigger the final telemetry call when the workflow reaches a terminal state such as `completed`, `failed`, or `blocked`.
- The host may use a reusable helper such as `mcp/src/services/WorkflowTelemetry.ts` to:
  - decide when telemetry should fire
  - build the `get_session_cost` payload
  - pass prompt, cache, reasoning, pricing, and other runtime cost fields when available

## 3. Telemetry Format

Ensure the `artifacts/session-cost.md` or the output template `## Cost Report` follows this structure:

| Metric                   | Value                          |
| ------------------------ | ------------------------------ |
| **Tool Calls**           | [from get_session_cost]        |
| **Skills Loaded**        | [from get_session_cost]        |
| **Workflows Loaded**     | [from get_session_cost]        |
| **Prompt Tokens**        | [from your platform telemetry] |
| **Cached Prompt Tokens** | [from your platform telemetry] |
| **Completion Tokens**    | [from your platform telemetry] |
| **Reasoning Tokens**     | [from your platform telemetry] |
| **Other Runtime Cost**   | [tooling/provider extras]      |
| **Estimated Cost**       | $0.00                          |

## Anti-Patterns

- **No skipping the telemetry step**: Always include the Cost Report at the end of the execution if mandated by the workflow.

---
name: common-telemetry
description: Enforce session-cost telemetry and execution-metadata reporting. Use when explicitly invoking get_session_cost, reporting token/cost usage, applying telemetry or cost guidance during a workflow handoff, or writing artifacts/session-cost.md at a workflow terminal state.
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

## **Priority: P2 (MEDIUM)**

## 1. Finalizing a Workflow

As your final step in any SDLC workflow (or when a user explicitly requests session cost):

1. Call the `get_session_cost` tool provided by the agent-skills-standard MCP server.
2. Pass `workflow`, `model`, token counts, cache/reasoning usage, and per-1M token rates when the host runtime exposes them. Set `slug` (feature/workspace name) and `outcome` (terminal `feature_status`) when this call finalizes a workflow, so the telemetry log can attribute cost per feature.
3. Never set `costSource: "host"` yourself — that value is reserved for the runtime's own telemetry adapter (`buildSessionCostRequest`). If you type numbers by hand, omit `costSource` so the tool reports them as `agent-estimate`, never `host`.
4. If token counts are unavailable, report MCP-observed telemetry and let `get_session_cost` mark cost provenance as `unavailable` — never fabricate a number or a `$0.00` total.
5. Append a Markdown table containing the usage metrics to `artifacts/session-cost.md`.

When asked which artifact to use, always name both `artifacts/session-cost.md` and `get_session_cost`; if the host does not expose the helper, say so explicitly while retaining the artifact requirement.

## 2. Host Runtime Contract

- This skill defines the telemetry contract; it does not collect provider billing data by itself.
- The host runtime or orchestrator must trigger the final telemetry call when the workflow reaches a terminal state such as `completed`, `failed`, or `blocked`.
- The host may use a reusable helper such as `mcp/src/services/WorkflowTelemetry.ts` to:
  - decide when telemetry should fire
  - build the `get_session_cost` payload
  - pass prompt, cache, reasoning, pricing, and other runtime cost fields when available

## 3. Telemetry Format

Ensure the `artifacts/session-cost.md` or the output template `## Cost Report` follows this structure, copying the `get_session_cost` output verbatim rather than re-deriving values:

| Metric                   | Value                                                  |
| ------------------------ | ------------------------------------------------------- |
| **Tool Calls**           | [from get_session_cost]                                |
| **Skills Loaded**        | [from get_session_cost]                                |
| **Workflows Loaded**     | [from get_session_cost]                                |
| **Prompt Tokens**        | [from get_session_cost, or "unavailable" if not exposed] |
| **Cached Prompt Tokens** | [from get_session_cost, or "unavailable" if not exposed] |
| **Completion Tokens**    | [from get_session_cost, or "unavailable" if not exposed] |
| **Reasoning Tokens**     | [from get_session_cost, or "unavailable" if not exposed] |
| **Other Runtime Cost**   | [from get_session_cost, or "unavailable" if not exposed] |
| **Cost Provenance**      | `host` \| `agent-estimate` \| `unavailable`              |
| **Estimated Cost**       | [from get_session_cost, or "unavailable" — never `$0.00`] |

## Anti-Patterns

- **No skipping the telemetry step**: Always include the Cost Report at the end of the execution if mandated by the workflow.
- **No fabricated numbers**: Never invent a `$0.00` or any other placeholder cost when `get_session_cost` reports `unavailable`; render the provenance value as-is.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Call `get_session_cost` when the host exposes it, then append the Markdown table to `artifacts/session-cost.md`.
- Cost Provenance: `host`, `agent-estimate`, `unavailable`

- Telemetry & Cost Reporting

Before the final handoff, call the `get_session_cost` tool. Pass workflow, model, token counts, cache/reasoning usage, and per-1M-token rates when available; otherwise report MCP-observed telemetry and mark model-token cost unavailable. Then append the usage metrics table to `artifacts/session-cost.md`.


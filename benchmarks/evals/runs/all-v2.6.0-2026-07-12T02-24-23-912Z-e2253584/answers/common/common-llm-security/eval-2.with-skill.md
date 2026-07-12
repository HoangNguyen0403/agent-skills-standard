# Security audit: autonomous file-reading and file-deletion agent

## Verdict

🔴 **LLM06 Excessive Agency (P0, confirmed).** An agent that can delete files and operates without human confirmation has destructive write access with no approval gate. A prompt injection, mistaken plan, or compromised tool call can cause irreversible data loss. The same missing controls also make arbitrary filesystem scope and unbounded agent loops immediate review concerns. A confirmed P0 finding caps the security score at 40/100.

## Required fix

Require explicit human confirmation immediately before every destructive operation, displaying the exact path and intended action. Use least privilege: read-only by default, a narrowly scoped workspace root, path canonicalization, symlink/traversal protections, and an allowlist of deletable paths. Prefer trash/quarantine with recovery over permanent deletion. Deny system files, credentials, repositories' control files, and paths outside the workspace.

Set a finite `maxIterations`/recursion depth, tool-call timeout, cancellation path, and per-run budget. Log actor, prompt/run ID, tool, canonical path, decision, and approval without logging secrets. Treat all tool arguments and model output as untrusted and validate them against a schema before dispatch.

## OWASP LLM Top 10 status

- LLM01 Prompt Injection: ⚠️ needs review — file contents and external text may contain indirect instructions that redirect the agent.
- LLM02 Sensitive Information Disclosure: ⚠️ needs review — file reads and logs may expose secrets or PII.
- LLM03 Supply Chain: ⚠️ needs review — verify agent framework, file plugins, dependencies, and model provenance.
- LLM04 Data & Model Poisoning: ⚠️ needs review — check whether read content or user-controlled files influence persistent training or retrieval data.
- LLM05 Improper Output Handling: 🔴 confirmed risk — model-generated paths/actions are security-sensitive tool inputs and must not be executed without schema and policy validation.
- LLM06 Excessive Agency: 🔴 confirmed — autonomous deletion without human-in-the-loop confirmation.
- LLM07 System Prompt Leakage: ⚠️ needs review — avoid exposing system instructions through file errors, tool output, or responses.
- LLM08 Vector & Embedding Weaknesses: ⚠️ needs review — applicable if file contents are embedded; enforce sanitization and tenant/workspace isolation.
- LLM09 Misinformation: ⚠️ needs review — require deterministic checks and approval when the agent's interpretation drives deletion.
- LLM10 Unbounded Consumption: 🔴 confirmed risk unless limits exist — enforce rate limits, tool-call budgets, timeouts, and agent iteration caps.


Treat this as a context-shape problem as well as a token-volume problem. A growing, frequently changing history can reduce KV-cache reuse because the model no longer sees the same prefix.

Apply these controls:

- Keep the prompt in a stable order: `System -> Tools -> RAG -> User`. Keep the system instructions, tool definitions, and other static material unchanged and at the front.
- Make the conversation append-only. Do not insert new messages into the middle or rewrite earlier turns. Put new dynamic information at the end.
- Mask oversized observations after extracting their signal. Any output over roughly 50 lines or 1 KB should be reduced to a semantic summary containing only relevant findings, IDs, errors, and next-step evidence. Never carry raw log/JSON dumps forward unnecessarily.
- Compact the older dialogue into a rolling state every 10 turns or 8,000 tokens. Preserve the original system prompt and last three messages verbatim; retain the goal, active task, status, errors, key decisions, active files, and next steps; drop chatter and superseded intermediate work.

The result should look like a stable prefix followed by a small current-state suffix, rather than a continuously rewritten transcript. For example:

```text
System: <unchanged system instructions>
Tools: <unchanged tool definitions>
RAG: <stable/relevant retrieved context>
Current_State: Goal=...; Status=...; Decisions=...; Errors=...; Next_Steps=...
Last_3_Messages: <kept verbatim>
New user/agent turn: <appended>
```

This bounds context growth, keeps the most important state visible, and maximizes the chance that the static prefix remains cacheable across API calls. Measure latency/cache behavior after adopting the stable ordering and compaction schedule to confirm the improvement.

